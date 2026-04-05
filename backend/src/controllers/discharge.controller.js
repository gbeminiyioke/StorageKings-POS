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

    const selectedItems = (items || []).filter((x) => x.selected);

    if (!selectedItems.length) {
      return res.status(400).json({
        message: "Please select at least one item to discharge",
      });
    }

    const branchResult = await client.query(
      `
      SELECT branch_prefix, next_discharge_no
      FROM branches
      WHERE branch_id = $1
      FOR UPDATE
      `,
      [branch_id],
    );

    const branch = branchResult.rows[0];

    const discharge_no = `DG${branch.branch_prefix}-${String(branch.next_discharge_no).padStart(8, "0")}`;

    const storageResult = await client.query(
      `
      SELECT storage_no
      FROM storage_headers
      WHERE storage_id = $1
      `,
      [storage_id],
    );

    const headerResult = await client.query(
      `
      INSERT INTO discharge_headers (
        discharge_no,
        storage_id,
        storage_no,
        customer_id,
        branch_id,
        discharge_date,
        discharge_notes,
        condition_filter,
        staff_signature,
        customer_signature,
        total_items,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        discharge_no,
        storage_id,
        storageResult.rows[0].storage_no,
        customer_id,
        branch_id,
        discharge_date,
        discharge_notes || null,
        condition || "Good",
        staff_signature || null,
        customer_signature || null,
        selectedItems.reduce(
          (sum, item) => sum + Number(item.discharge_quantity || 0),
          0,
        ),
        req.user.id,
      ],
    );

    const discharge = headerResult.rows[0];

    for (const item of selectedItems) {
      const current = await client.query(
        `
        SELECT product_id, remaining_quantity, discharged_quantity
        FROM storage_items
        WHERE storage_item_id = $1
        FOR UPDATE
        `,
        [item.storage_item_id],
      );

      const row = current.rows[0];
      const dischargeQty = Number(item.discharge_quantity || 0);

      if (dischargeQty <= 0) continue;

      if (dischargeQty > Number(row.remaining_quantity)) {
        throw new Error("Discharge quantity exceeds remaining quantity");
      }

      const afterQty = Number(row.remaining_quantity) - dischargeQty;

      await client.query(
        `
        INSERT INTO discharge_details (
          discharge_id,
          storage_item_id,
          product_id,
          quantity_before,
          discharged_quantity,
          quantity_after,
          condition_on_discharge
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          discharge.discharge_id,
          item.storage_item_id,
          row.product_id,
          row.remaining_quantity,
          dischargeQty,
          afterQty,
          item.condition || "Good",
        ],
      );

      await client.query(
        `
        UPDATE storage_items
        SET
          discharged_quantity = discharged_quantity + $1,
          remaining_quantity = remaining_quantity - $1
        WHERE storage_item_id = $2
        `,
        [dischargeQty, item.storage_item_id],
      );
    }

    const remaining = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM storage_items
      WHERE storage_id = $1
        AND remaining_quantity > 0
      `,
      [storage_id],
    );

    const newStatus = remaining.rows[0].count === 0 ? "DISCHARGED" : "PARTIAL";

    await client.query(
      `
      UPDATE storage_headers
      SET status = $1
      WHERE storage_id = $2
      `,
      [newStatus, storage_id],
    );

    await client.query(
      `
      UPDATE branches
      SET next_discharge_no = next_discharge_no + 1
      WHERE branch_id = $1
      `,
      [branch_id],
    );

    await client.query("COMMIT");

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      branchId: branch_id,
      module: "DISCHARGE",
      action: "CREATE",
      description: `Created discharge ${discharge_no}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      discharge_id: discharge.discharge_id,
      discharge_no,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({
      message: err.message || "Failed to save discharge",
    });
  } finally {
    client.release();
  }
};

export const getRecentDischarges = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        dh.discharge_id,
        dh.discharge_no,
        dh.discharge_date,
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
