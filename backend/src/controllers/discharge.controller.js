import pool from "../config/db.js";
import logActivity from "../utils/activityLogger.js";
import { generateDischargePdf } from "../services/dischargePdf.service.js";
import { sendEmailWithAttachment } from "../services/email.service.js";

export const searchDischargeCustomers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    if (!q) return res.json([]);

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.fullname,
        c.email,
        c.telephone,
        b.branch_name
      FROM customers c
      LEFT JOIN branches b
        ON b.branch_id = c.createdatbranchid
      WHERE c.enable = true
        AND (
          c.fullname ILIKE $1
          OR c.telephone ILIKE $1
          OR c.email ILIKE $1
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

export const getNextDischargeNo = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT branch_prefix, next_discharge_no
      FROM branches
      WHERE branch_id = $1
      `,
      [req.params.branch_id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const branch = result.rows[0];

    res.json({
      discharge_no: `DG${branch.branch_prefix}-${String(branch.next_discharge_no).padStart(8, "0")}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate discharge number" });
  }
};

export const getCustomerStorages = async (req, res) => {
  try {
    const { customer_id, branch_id } = req.query;

    const result = await pool.query(
      `
      SELECT
        sh.storage_id,
        sh.storage_no,
        sh.status,
        sh.storage_space_product_id,
        p.product_name AS storage_space_name
      FROM storage_headers sh
      LEFT JOIN products p
        ON p.product_id = sh.storage_space_product_id
      WHERE sh.customer_id = $1
        AND sh.branch_id = $2
        AND sh.status IN ('ACTIVE', 'PARTIAL')
        AND sh.deleted = false
      ORDER BY sh.storage_id DESC
      `,
      [customer_id, branch_id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load customer storages" });
  }
};

export const getStorageItemsForDischarge = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        si.storage_item_id,
        si.product_id,
        p.product_name,
        p.image_url,
        COALESCE(c.category_name, '') AS category_name,
        sh.received_date,
        si.condition,
        si.received_quantity,
        si.remaining_quantity
      FROM storage_items si
      INNER JOIN storage_headers sh ON sh.storage_id = si.storage_id
      INNER JOIN products p ON p.product_id = si.product_id
      LEFT JOIN categories c ON c.category_id = p.category_id
      WHERE si.storage_id = $1
        AND si.remaining_quantity > 0
      ORDER BY si.storage_item_id
      `,
      [req.params.storage_id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load storage items" });
  }
};

/*================================================
  CREATE THE DISCHARGE RECORD
==================================================*/
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
      throw new Error("Select at least one valid item");
    }

    //Lock branch
    const branchRes = await client.query(
      `SELECT branch_prefix, next_discharge_no
       FROM branches
       WHERE branch_id = $1
       FOR UPDATE`,
      [branch_id],
    );

    if (!branchRes.rows.length) throw new Error("Invalid branch");

    const branch = branchRes.rows[0];

    const discharge_no = `DG${branch.branch_prefix}-${String(
      branch.next_discharge_no,
    ).padStart(8, "0")}`;

    //Validate storage ownership
    const storageRes = await client.query(
      `SELECT storage_no, customer_id
       FROM storage_headers
       WHERE storage_id = $1
       FOR UPDATE`,
      [storage_id],
    );

    if (!storageRes.rows.length) throw new Error("Storage not found");

    if (storageRes.rows[0].customer_id !== customer_id) {
      throw new Error("Storage does not belong to customer");
    }

    //Insert header
    const header = await client.query(
      `INSERT INTO discharge_headers (
        discharge_no, storage_id, storage_no, customer_id,
        branch_id, discharge_date, discharge_notes,
        condition_filter, staff_signature, customer_signature,
        total_items, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        discharge_no,
        storage_id,
        storageRes.rows[0].storage_no,
        customer_id,
        branch_id,
        discharge_date,
        discharge_notes || null,
        condition || "Good",
        staff_signature || null,
        customer_signature || null,
        0,
        req.user.id,
      ],
    );

    const discharge = header.rows[0];

    let totalQty = 0;

    for (const item of selectedItems) {
      const lockItem = await client.query(
        `SELECT product_id, remaining_quantity
         FROM storage_items
         WHERE storage_item_id = $1
         FOR UPDATE`,
        [item.storage_item_id],
      );

      if (!lockItem.rows.length) continue;

      const row = lockItem.rows[0];
      const qty = Number(item.discharge_quantity);

      if (qty <= 0) continue;

      if (qty > Number(row.remaining_quantity)) {
        throw new Error("Quantity exceeds remaining");
      }

      const after = Number(row.remaining_quantity) - qty;

      await client.query(
        `INSERT INTO discharge_details (
          discharge_id, storage_item_id, product_id,
          quantity_before, discharged_quantity, quantity_after,
          condition_on_discharge
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          discharge.discharge_id,
          item.storage_item_id,
          row.product_id,
          row.remaining_quantity,
          qty,
          after,
          item.condition || "Good",
        ],
      );

      await client.query(
        `UPDATE storage_items
         SET discharged_quantity = discharged_quantity + $1,
             retrieved_quantity = retrieved_quantity + $1
         WHERE storage_item_id = $2`,
        [qty, item.storage_item_id],
      );

      totalQty += qty;
    }

    //Update totals
    await client.query(
      `UPDATE discharge_headers
       SET total_items = $1
       WHERE discharge_id = $2`,
      [totalQty, discharge.discharge_id],
    );

    //Update storage status
    const remaining = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM storage_items
       WHERE storage_id = $1 AND remaining_quantity > 0`,
      [storage_id],
    );

    const status = remaining.rows[0].count === 0 ? "DISCHARGED" : "PARTIAL";

    await client.query(
      `UPDATE storage_headers SET status = $1 WHERE storage_id = $2`,
      [status, storage_id],
    );

    // Increment counter
    await client.query(
      `UPDATE branches
       SET next_discharge_no = next_discharge_no + 1
       WHERE branch_id = $1`,
      [branch_id],
    );

    await client.query("COMMIT");

    res.status(201).json({
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

/*================================================
  GET RECENT DISCHARGES
==================================================*/
export const getRecentDischarges = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        dh.discharge_id,
        dh.discharge_no,
        dh.discharge_date,
        dh.reversed,
        b.branch_name,
        c.fullname AS customer_name,
        sh.status AS storage_status
      FROM discharge_headers dh
      INNER JOIN customers c ON c.id = dh.customer_id
      INNER JOIN branches b ON b.branch_id = dh.branch_id
      INNER JOIN storage_headers sh ON sh.storage_id = dh.storage_id
      WHERE dh.discharge_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY dh.discharge_id DESC
      `,
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load recent discharges" });
  }
};

export const downloadDischargePdf = async (req, res) => {
  try {
    const pdf = await generateDischargePdf(req.params.discharge_id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=discharge.pdf");
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
};

export const emailDischargePdf = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT dh.discharge_no, c.email, c.fullname
      FROM discharge_headers dh
      INNER JOIN customers c ON c.id = dh.customer_id
      WHERE dh.discharge_id = $1
      `,
      [req.params.discharge_id],
    );

    const row = result.rows[0];

    if (!row?.email) {
      return res.status(400).json({
        message: "Customer has no email address",
      });
    }

    const pdf = await generateDischargePdf(req.params.discharge_id);

    await sendEmailWithAttachment({
      to: row.email,
      subject: `Item Discharge ${row.discharge_no}`,
      text: `Hello ${row.fullname}, attached is your discharge receipt ${row.discharge_no}.`,
      buffer: pdf,
      filename: `${row.discharge_no}.pdf`,
    });

    res.json({ message: "Email sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to email PDF" });
  }
};

export const scanDischargeItem = async (req, res) => {
  try {
    const { barcode } = req.body;

    const result = await pool.query(
      `
      SELECT
        si.storage_item_id,
        si.product_id,
        si.remaining_quantity,
        si.received_quantity,
        si.condition,

        sh.storage_id,
        sh.storage_no,
        sh.customer_id,
        sh.branch_id,
        sh.received_date,

        c.fullname,
        c.email,
        c.telephone,

        p.product_name,
        p.image_url,
        cat.category_name,

        sh.storage_space_product_id,
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
      return res
        .status(404)
        .json({ message: "Item not found or already discharged" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Scan failed" });
  }
};

/*==============================================
  DISCHARGE REVERSAL
================================================*/
export const reverseDischarge = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { discharge_id } = req.params;
    const { reason } = req.body;

    // Lock discharge
    const headerRes = await client.query(
      `SELECT * FROM discharge_headers
       WHERE discharge_id = $1
       FOR UPDATE`,
      [discharge_id],
    );

    if (!headerRes.rows.length) {
      throw new Error("Discharge not found");
    }

    const discharge = headerRes.rows[0];

    // Prevent double reversal
    if (discharge.reversed) {
      throw new Error("Discharge already reversed");
    }

    // Get details
    const detailsRes = await client.query(
      `SELECT * FROM discharge_details
       WHERE discharge_id = $1`,
      [discharge_id],
    );

    if (!detailsRes.rows.length) {
      throw new Error("No discharge items found");
    }

    // Restore quantities
    for (const item of detailsRes.rows) {
      await client.query(
        `UPDATE storage_items
         SET
           retrieved_quantity = retrieved_quantity - $1,
           discharged_quantity = discharged_quantity - $1
         WHERE storage_item_id = $2`,
        [item.discharged_quantity, item.storage_item_id],
      );
    }

    // Recalculate storage status
    const remainingRes = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM storage_items
       WHERE storage_id = $1
         AND remaining_quantity > 0`,
      [discharge.storage_id],
    );

    const newStatus = remainingRes.rows[0].count > 0 ? "PARTIAL" : "ACTIVE";

    await client.query(
      `UPDATE storage_headers
       SET status = $1
       WHERE storage_id = $2`,
      [newStatus, discharge.storage_id],
    );

    // Mark reversed
    await client.query(
      `UPDATE discharge_headers
       SET
         reversed = true,
         reversed_by = $1,
         reversed_at = NOW(),
         reversal_reason = $2
       WHERE discharge_id = $3`,
      [req.user.id, reason || null, discharge_id],
    );

    // Audit log
    await client.query(
      `INSERT INTO discharge_reversals
       (discharge_id, reversed_by, reversal_reason)
       VALUES ($1,$2,$3)`,
      [discharge_id, req.user.id, reason || null],
    );

    await client.query("COMMIT");

    res.json({ message: "Discharge reversed successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("REVERSAL ERROR:", err);

    res.status(500).json({
      message: err.message || "Failed to reverse discharge",
    });
  } finally {
    client.release();
  }
};
