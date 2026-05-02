import pool from "../config/db.js";
import logActivity from "../utils/activityLogger.js";
import { generateDischargePdf } from "../services/dischargePdf.service.js";
import { sendEmailWithAttachment } from "../services/email.service.js";

/* =========================
   SEARCH CUSTOMERS
========================= */
export const searchDischargeCustomers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    const result = await pool.query(
      `
      SELECT c.id, c.fullname, c.email, c.telephone, b.branch_name
      FROM customers c
      LEFT JOIN branches b ON b.branch_id = c.createdatbranchid
      WHERE c.enable = true
        AND (
          c.fullname ILIKE $1 OR
          c.telephone ILIKE $1 OR
          c.email ILIKE $1
        )
      ORDER BY c.fullname
      LIMIT 20
      `,
      [`%${q}%`],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to search customers" });
  }
};

/* =========================
   BRANCHES
========================= */
export const getDischargeBranches = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT b.branch_id, b.branch_name, b.branch_prefix
      FROM user_branches ub
      INNER JOIN branches b ON b.branch_id = ub.branch_id
      WHERE ub.user_id = $1
      ORDER BY b.branch_name
      `,
      [req.user.id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load branches" });
  }
};

/* =========================
   NEXT NUMBER
========================= */
export const getNextDischargeNo = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT branch_prefix, next_discharge_no FROM branches WHERE branch_id = $1`,
      [req.params.branch_id],
    );

    const branch = result.rows[0];

    res.json({
      discharge_no: `DG${branch.branch_prefix}-${String(
        branch.next_discharge_no,
      ).padStart(8, "0")}`,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate number" });
  }
};

/* =========================
   STORAGE LIST
========================= */
export const getCustomerStorages = async (req, res) => {
  try {
    const { customer_id, branch_id } = req.query;

    const result = await pool.query(
      `
      SELECT sh.storage_id, sh.storage_no, sh.status,
             p.product_name AS storage_space_name
      FROM storage_headers sh
      LEFT JOIN products p ON p.product_id = sh.storage_space_product_id
      WHERE sh.customer_id = $1
        AND sh.branch_id = $2
        AND sh.status IN ('ACTIVE','PARTIAL')
        AND sh.deleted = false
      ORDER BY sh.storage_id DESC
      `,
      [customer_id, branch_id],
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to load storages" });
  }
};

/* =========================
   STORAGE ITEMS
========================= */
export const getStorageItemsForDischarge = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        si.storage_item_id,
        si.product_id,
        p.product_name,
        sh.received_date,
        si.condition,
        si.received_quantity,
        si.remaining_quantity
      FROM storage_items si
      INNER JOIN storage_headers sh ON sh.storage_id = si.storage_id
      INNER JOIN products p ON p.product_id = si.product_id
      WHERE si.storage_id = $1
        AND si.remaining_quantity > 0
      ORDER BY si.storage_item_id
      `,
      [req.params.storage_id],
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Failed to load items" });
  }
};

/* =========================
   CREATE DISCHARGE (NO INVENTORY UPDATE)
========================= */
export const createDischarge = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      customer_id,
      branch_id,
      storage_id,
      discharge_date,
      discharge_notes,
      condition,
      staff_signature,
      customer_signature,
      items,
    } = req.body;

    const selectedItems = (items || []).filter(
      (x) => x.selected && Number(x.discharge_quantity) > 0,
    );

    if (!selectedItems.length) {
      throw new Error("No valid items selected");
    }

    const branch = await client.query(
      `SELECT * FROM branches WHERE branch_id=$1 FOR UPDATE`,
      [branch_id],
    );

    const discharge_no = `DG${branch.rows[0].branch_prefix}-${String(
      branch.rows[0].next_discharge_no,
    ).padStart(8, "0")}`;

    const storage = await client.query(
      `SELECT storage_no FROM storage_headers WHERE storage_id=$1`,
      [storage_id],
    );

    const header = await client.query(
      `
      INSERT INTO discharge_headers (
        discharge_no, storage_id, storage_no,
        customer_id, branch_id, discharge_date,
        discharge_notes, condition_filter,
        staff_signature, customer_signature,
        total_items, created_by,
        approval_status, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'PENDING','PENDING')
      RETURNING *
      `,
      [
        discharge_no,
        storage_id,
        storage.rows[0].storage_no,
        customer_id,
        branch_id,
        discharge_date,
        discharge_notes,
        condition,
        staff_signature,
        customer_signature,
        selectedItems.reduce((sum, i) => sum + Number(i.discharge_quantity), 0),
        req.user.id,
      ],
    );

    const discharge = header.rows[0];

    for (const item of selectedItems) {
      const row = await client.query(
        `SELECT * FROM storage_items WHERE storage_item_id=$1`,
        [item.storage_item_id],
      );

      await client.query(
        `
        INSERT INTO discharge_details (
          discharge_id, storage_item_id, product_id,
          quantity_before, discharged_quantity,
          quantity_after, condition_on_discharge
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          discharge.discharge_id,
          item.storage_item_id,
          row.rows[0].product_id,
          row.rows[0].remaining_quantity,
          item.discharge_quantity,
          row.rows[0].remaining_quantity - item.discharge_quantity,
          item.condition,
        ],
      );
    }

    await client.query(
      `UPDATE branches SET next_discharge_no = next_discharge_no + 1 WHERE branch_id=$1`,
      [branch_id],
    );

    await client.query("COMMIT");

    res.json({
      discharge_id: discharge.discharge_id,
      discharge_no,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

/* =========================
   APPROVE DISCHARGE
========================= */
export const approveDischarge = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { discharge_id } = req.params;

    const header = await client.query(
      `SELECT * FROM discharge_headers WHERE discharge_id=$1 FOR UPDATE`,
      [discharge_id],
    );

    const d = header.rows[0];

    if (d.approval_status === "APPROVED") throw new Error("Already approved");

    if (d.reversed) throw new Error("Cannot approve reversed discharge");

    const details = await client.query(
      `SELECT * FROM discharge_details WHERE discharge_id=$1`,
      [discharge_id],
    );

    for (const item of details.rows) {
      const lock = await client.query(
        `SELECT remaining_quantity FROM storage_items WHERE storage_item_id=$1 FOR UPDATE`,
        [item.storage_item_id],
      );

      if (item.discharged_quantity > lock.rows[0].remaining_quantity)
        throw new Error("Stock mismatch during approval");

      await client.query(
        `
        UPDATE storage_items
        SET
          retrieved_quantity = retrieved_quantity + $1,
          discharged_quantity = discharged_quantity + $1
        WHERE storage_item_id = $2
        `,
        [item.discharged_quantity, item.storage_item_id],
      );
    }

    await client.query(
      `
      UPDATE discharge_headers
      SET approval_status='APPROVED',
          approved_by=$1,
          approved_at=NOW(),
          status='COMPLETED'
      WHERE discharge_id=$2
      `,
      [req.user.id, discharge_id],
    );

    await client.query("COMMIT");

    res.json({ message: "Approved successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

/* =========================
   REJECT
========================= */
export const rejectDischarge = async (req, res) => {
  try {
    await pool.query(
      `UPDATE discharge_headers SET approval_status='REJECTED', status='REJECTED' WHERE discharge_id=$1`,
      [req.params.discharge_id],
    );

    res.json({ message: "Rejected" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   RECENT
========================= */
export const getRecentDischarges = async (req, res) => {
  const result = await pool.query(
    `
    SELECT dh.*, c.fullname AS customer_name, b.branch_name
    FROM discharge_headers dh
    INNER JOIN customers c ON c.id = dh.customer_id
    INNER JOIN branches b ON b.branch_id = dh.branch_id
    ORDER BY dh.discharge_id DESC
    `,
  );

  res.json(result.rows);
};

/* =========================
   PDF
========================= */
export const downloadDischargePdf = async (req, res) => {
  const pdf = await generateDischargePdf(req.params.discharge_id);
  res.setHeader("Content-Type", "application/pdf");
  res.send(pdf);
};

/* =========================
   EMAIL
========================= */
export const emailDischargePdf = async (req, res) => {
  const row = await pool.query(
    `
    SELECT dh.discharge_no, c.email, c.fullname
    FROM discharge_headers dh
    INNER JOIN customers c ON c.id = dh.customer_id
    WHERE dh.discharge_id = $1
    `,
    [req.params.discharge_id],
  );

  const pdf = await generateDischargePdf(req.params.discharge_id);

  await sendEmailWithAttachment({
    to: row.rows[0].email,
    subject: `Discharge ${row.rows[0].discharge_no}`,
    text: "Attached is your discharge receipt",
    buffer: pdf,
    filename: `${row.rows[0].discharge_no}.pdf`,
  });

  res.json({ message: "Email sent" });
};

export const scanDischargeItem = async (req, res) => {
  try {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ message: "Barcode is required" });
    }

    const result = await pool.query(
      `
      SELECT
        si.storage_item_id,
        si.product_id,
        si.remaining_quantity,
        si.received_quantity,
        si.condition,
        si.product_sequence,

        sh.storage_id,
        sh.storage_no,
        sh.customer_id,
        sh.branch_id,

        c.fullname,
        c.email,
        c.telephone,

        p.product_name,
        p.product_code,
        p.image_url,
        cat.category_name,

        sp.product_name AS storage_space_name

      FROM storage_items si
      INNER JOIN storage_headers sh ON sh.storage_id = si.storage_id
      INNER JOIN customers c ON c.id = sh.customer_id
      INNER JOIN products p ON p.product_id = si.product_id
      LEFT JOIN categories cat ON cat.category_id = p.category_id
      LEFT JOIN products sp ON sp.product_id = sh.storage_space_product_id

      WHERE si.generated_barcode = $1
        AND si.remaining_quantity > 0
      `,
      [barcode],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Item not found or already discharged",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Scan failed" });
  }
};

export const reverseDischarge = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { discharge_id } = req.params;
    const { reason } = req.body;

    // lock discharge
    const headerRes = await client.query(
      `
      SELECT * FROM discharge_headers
      WHERE discharge_id = $1
      FOR UPDATE
      `,
      [discharge_id],
    );

    if (!headerRes.rows.length) {
      throw new Error("Discharge not found");
    }

    const discharge = headerRes.rows[0];

    if (discharge.is_reversed) {
      throw new Error("Discharge already reversed");
    }

    // get details
    const detailsRes = await client.query(
      `
      SELECT *
      FROM discharge_details
      WHERE discharge_id = $1
      `,
      [discharge_id],
    );

    // restore quantities
    for (const item of detailsRes.rows) {
      await client.query(
        `
        UPDATE storage_items
        SET
          retrieved_quantity = retrieved_quantity - $1,
          discharged_quantity = discharged_quantity - $1
        WHERE storage_item_id = $2
        `,
        [item.discharged_quantity, item.storage_item_id],
      );
    }

    // reset storage status
    await client.query(
      `
      UPDATE storage_headers
      SET status = 'ACTIVE'
      WHERE storage_id = $1
      `,
      [discharge.storage_id],
    );

    // mark reversed
    await client.query(
      `
      UPDATE discharge_headers
      SET
        is_reversed = true,
        reversed_by = $1,
        reversed_at = NOW(),
        reversal_reason = $2
      WHERE discharge_id = $3
      `,
      [req.user.id, reason || null, discharge_id],
    );

    // optional audit
    await client.query(
      `
      INSERT INTO discharge_reversals (discharge_id, reversed_by, reversal_reason)
      VALUES ($1,$2,$3)
      `,
      [discharge_id, req.user.id, reason || null],
    );

    await client.query("COMMIT");

    res.json({ message: "Discharge reversed successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};
