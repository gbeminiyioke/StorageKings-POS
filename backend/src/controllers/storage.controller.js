import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import { generateStoragePdf } from "../services/storagePdf.service.js";
import { sendEmailWithAttachment } from "../services/email.service.js";
import logActivity from "../utils/activityLogger.js";

/* ======================================================
   CUSTOMER SEARCH
====================================================== */
export const searchStorageCustomers = async (req, res) => {
  try {
    const { q = "" } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const result = await pool.query(
      `
      SELECT DISTINCT
        c.id,
        c.fullname,
        c.email,
        c.telephone,
        b.branch_name
      FROM customers c
      LEFT JOIN user_branches ub
        ON ub.user_id = $2
      LEFT JOIN branches b
        ON b.branch_id = ub.branch_id
      WHERE c.enable = true
        AND (
          c.fullname ILIKE $1
          OR c.telephone ILIKE $1
          OR c.email ILIKE $1
        )
      ORDER BY c.fullname
      LIMIT 20
      `,
      [`%${q.trim()}%`, req.user.id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("searchStorageCustomers:", error);
    res.status(500).json({ message: "Failed to search customers" });
  }
};

/* ======================================================
   USER BRANCHES
====================================================== */
export const getUserBranches = async (req, res) => {
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
  } catch (error) {
    console.error("getUserBranches:", error);
    res.status(500).json({ message: "Failed to load branches" });
  }
};

/* ======================================================
   STORAGE SPACES
====================================================== */
export const getStorageSpaces = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT product_id, product_name
      FROM products
      WHERE deleted = false AND storage = true
      ORDER BY product_name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("getStorageSpaces:", error);
    res.status(500).json({ message: "Failed to load storage spaces" });
  }
};

/* ======================================================
   PRODUCT SEARCH
====================================================== */
export const searchStorageProducts = async (req, res) => {
  try {
    const { q = "" } = req.query;

    if (!q) return res.json([]);

    const result = await pool.query(
      `
      SELECT
        p.product_id,
        p.product_name,
        p.product_code,
        p.image_url,
        COALESCE(c.category_name,'') AS category_name
      FROM products p
      LEFT JOIN categories c ON c.category_id = p.category_id
      WHERE p.deleted = false
        AND p.can_be_sold = false
        AND (p.product_name ILIKE $1 OR p.product_code ILIKE $1)
      ORDER BY p.product_name
      LIMIT 30
      `,
      [`%${q.trim()}%`],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("searchStorageProducts:", error);
    res.status(500).json({ message: "Failed to search products" });
  }
};

/* ======================================================
   PRODUCT BY BARCODE
====================================================== */
export const getStorageProductByBarcode = async (req, res) => {
  try {
    const { product_code } = req.params;

    const result = await pool.query(
      `
      SELECT
        p.product_id,
        p.product_name,
        p.product_code,
        p.image_url,
        COALESCE(c.category_name,'') AS category_name
      FROM products p
      LEFT JOIN categories c ON c.category_id = p.category_id
      WHERE p.deleted = false
        AND p.can_be_sold = false
        AND p.product_code = $1
      LIMIT 1
      `,
      [product_code],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("getStorageProductByBarcode:", error);
    res.status(500).json({ message: "Failed to load product" });
  }
};

/* ======================================================
   NEXT STORAGE NUMBER
====================================================== */
export const getNextStorageNo = async (req, res) => {
  try {
    const { branch_id } = req.params;

    const result = await pool.query(
      `
      SELECT branch_prefix, next_storage_no
      FROM branches
      WHERE branch_id = $1
      `,
      [branch_id],
    );

    const branch = result.rows[0];

    const padded = String(branch.next_storage_no).padStart(8, "0");

    res.json({
      storage_no: `SG${branch.branch_prefix}-${padded}`,
    });
  } catch (error) {
    console.error("getNextStorageNo:", error);
    res.status(500).json({ message: "Failed to generate number" });
  }
};

/* ======================================================
   CREATE STORAGE (UPDATED FOR FORM DATA + FILE UPLOAD)
====================================================== */
export const createStorage = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      customer_id,
      branch_id,
      storage_space_product_id,
      received_date,
      received_notes,
      staff_signature,
      customer_signature,
      preprinted,
      storage_period_months,
      max_monthly_visits,
    } = req.body;

    const items = JSON.parse(req.body.items || "[]");

    if (!customer_id || !branch_id || !items.length) {
      return res.status(400).json({
        message: "Customer, branch and items are required",
      });
    }

    await client.query("BEGIN");

    const branchRes = await client.query(
      `
      SELECT branch_prefix, next_storage_no
      FROM branches
      WHERE branch_id = $1
      FOR UPDATE
      `,
      [branch_id],
    );

    const branch = branchRes.rows[0];

    const padded = String(branch.next_storage_no).padStart(8, "0");
    const storage_no = `SG${branch.branch_prefix}-${padded}`;

    const status = preprinted === "true" ? "PRINTED" : "ACTIVE";

    /* 🔥 DISCHARGE DATE CALCULATION */
    const baseDate = new Date(received_date);
    const dischargeDate = new Date(baseDate);
    dischargeDate.setMonth(
      dischargeDate.getMonth() + Number(storage_period_months || 0),
    );

    const attachment_path = req.file
      ? `/uploads/storage/${req.file.filename}`
      : null;

    const header = await client.query(
      `
      INSERT INTO storage_headers (
        storage_no,
        customer_id,
        branch_id,
        storage_space_product_id,
        received_date,
        discharge_date,
        storage_period_months,
        status,
        received_notes,
        staff_signature,
        customer_signature,
        total_items,
        created_by,
        attachment_path,
        attachment_filename,
        attachment_mimetype,
        max_monthly_visits,
        current_visits
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
      )
      RETURNING *
      `,
      [
        storage_no,
        customer_id,
        branch_id,
        storage_space_product_id || null,
        received_date,
        dischargeDate,
        storage_period_months || 0,
        status,
        received_notes || null,
        staff_signature || null,
        customer_signature || null,
        items.length,
        req.user.id,
        attachment_path,
        req.file?.originalname || null,
        req.file?.mimetype || null,
        max_monthly_visits || 3,
        0,
      ],
    );

    const storage = header.rows[0];

    /* 🔥 ITEMS */
    for (const item of items) {
      const qty = Number(item.quantity || 1);

      for (let i = 1; i <= qty; i++) {
        const seq = String(i).padStart(3, "0");

        const barcode = `${storage_no}/${item.product_code}/${seq}`;

        await client.query(
          `
          INSERT INTO storage_items (
            storage_id,
            product_id,
            quantity,
            received_quantity,
            condition,
            item_notes,
            generated_barcode,
            product_sequence
          )
          VALUES ($1,$2,1,$3,$4,$5,$6,$7)
          `,
          [
            storage.storage_id,
            item.product_id,
            preprinted === "true" ? 0 : 1,
            item.condition || "Good",
            item.item_notes || null,
            barcode,
            i,
          ],
        );
      }
    }

    await client.query(
      `UPDATE branches SET next_storage_no = next_storage_no + 1 WHERE branch_id = $1`,
      [branch_id],
    );

    await client.query("COMMIT");

    res.json({
      message: "Storage saved successfully",
      storage_id: storage.storage_id,
      storage_no,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Failed to save storage" });
  } finally {
    client.release();
  }
};

/* ======================================================
   RECENT STORAGES
====================================================== */
export const getRecentStorages = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        sh.storage_id,
        sh.storage_no,
        sh.received_date,
        sh.status,
        c.fullname AS customer_name,
        c.email,
        b.branch_name
      FROM storage_headers sh
      INNER JOIN customers c
        ON c.id = sh.customer_id
      INNER JOIN branches b
        ON b.branch_id = sh.branch_id
      WHERE sh.deleted = false
        AND sh.received_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY sh.storage_id DESC
      `,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("getRecentStorages error:", error);

    res.status(500).json({
      message: "Failed to load recent storages",
    });
  }
};

/* ======================================================
   STORAGE DETAILS
====================================================== */
export const getStorageDetails = async (req, res) => {
  try {
    const { storage_id } = req.params;

    const headerResult = await pool.query(
      `
      SELECT
        sh.*,
        c.fullname,
        c.email,
        c.telephone,
        b.branch_name
      FROM storage_headers sh
      INNER JOIN customers c
        ON c.id = sh.customer_id
      INNER JOIN branches b
        ON b.branch_id = sh.branch_id
      WHERE sh.storage_id = $1
      `,
      [storage_id],
    );

    if (!headerResult.rows.length) {
      return res.status(404).json({
        message: "Storage record not found",
      });
    }

    const itemsResult = await pool.query(
      `
      SELECT
        si.storage_item_id,
        si.quantity,
        si.received_quantity,
        si.condition,
        si.item_notes,
        si.generated_barcode,
        si.product_sequence,
        p.product_id,
        p.product_name,
        p.product_code,
        p.image_url,
        COALESCE(c.category_name, '') AS category_name
      FROM storage_items si
      INNER JOIN products p
        ON p.product_id = si.product_id
      LEFT JOIN categories c
        ON c.category_id = p.category_id
      WHERE si.storage_id = $1
      ORDER BY si.storage_item_id
      `,
      [storage_id],
    );

    const header = headerResult.rows[0];

    res.json({
      ...header,
      customer: {
        id: header.customer_id,
        fullname: header.fullname,
        email: header.email,
        telephone: header.telephone,
        branch_name: header.branch_name,
      },
      storage_items: itemsResult.rows,
    });
  } catch (error) {
    console.error("getStorageDetails error:", error);

    res.status(500).json({
      message: "Failed to load storage details",
    });
  }
};

/* ======================================================
   STORAGE ITEMS FOR LABEL PRINTING
====================================================== */
export const getStorageItems = async (req, res) => {
  try {
    const { storage_id } = req.params;

    const result = await pool.query(
      `
      SELECT
        si.storage_item_id,
        si.generated_barcode,
        si.product_sequence,
        p.product_name,
        p.product_code,
        COUNT(*) OVER (
          PARTITION BY si.storage_id, si.product_id
        ) AS total_for_product
      FROM storage_items si
      INNER JOIN products p
        ON p.product_id = si.product_id
      WHERE si.storage_id = $1
      ORDER BY si.storage_item_id
      `,
      [storage_id],
    );

    res.json({
      items: result.rows,
    });
  } catch (error) {
    console.error("getStorageItems error:", error);

    res.status(500).json({
      message: "Failed to load storage items",
    });
  }
};

/* ======================================================
   CONFIRM PRINTED BARCODE
====================================================== */
export const confirmStorageBarcode = async (req, res) => {
  const client = await pool.connect();

  try {
    const { storage_id } = req.params;
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({
        message: "Barcode is required",
      });
    }

    await client.query("BEGIN");

    const itemResult = await client.query(
      `
      SELECT
        si.*,
        sh.branch_id
      FROM storage_items si
      INNER JOIN storage_headers sh
        ON sh.storage_id = si.storage_id
      WHERE si.storage_id = $1
        AND si.generated_barcode = $2
      FOR UPDATE
      `,
      [storage_id, barcode],
    );

    if (!itemResult.rows.length) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Barcode not found",
      });
    }

    const item = itemResult.rows[0];

    if (Number(item.received_quantity || 0) >= 1) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "This barcode has already been confirmed",
      });
    }

    await client.query(
      `
      UPDATE storage_items
      SET received_quantity = 1
      WHERE storage_item_id = $1
      `,
      [item.storage_item_id],
    );

    await client.query(
      `
      INSERT INTO products_by_branch (
        product_id,
        branch_id,
        selling_price,
        stock_quantity,
        auto_price_sync,
        reserved_quantity
      )
      VALUES ($1,$2,0,1,true,0)
      ON CONFLICT (product_id, branch_id)
      DO UPDATE
      SET stock_quantity = products_by_branch.stock_quantity + 1
      `,
      [item.product_id, item.branch_id],
    );

    const remaining = await client.query(
      `
      SELECT COUNT(*)::INTEGER AS pending
      FROM storage_items
      WHERE storage_id = $1
        AND COALESCE(received_quantity, 0) = 0
      `,
      [storage_id],
    );

    if (remaining.rows[0].pending === 0) {
      await client.query(
        `
        UPDATE storage_headers
        SET status = 'ACTIVE'
        WHERE storage_id = $1
        `,
        [storage_id],
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Barcode confirmed successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("confirmStorageBarcode error:", error);

    res.status(500).json({
      message: "Failed to confirm barcode",
    });
  } finally {
    client.release();
  }
};

/* ======================================================
   VIEW / PRINT PDF
====================================================== */
export const getStoragePdf = async (req, res) => {
  try {
    const { token } = req.query;
    const { storage_id } = req.params;

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    jwt.verify(token, process.env.JWT_SECRET);

    const pdfBuffer = await generateStoragePdf(storage_id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="storage-${storage_id}.pdf"`,
    );

    res.send(pdfBuffer);
  } catch (error) {
    console.error("getStoragePdf error:", error);

    res.status(500).json({
      message: "Failed to generate storage PDF",
    });
  }
};

/* ======================================================
   EMAIL PDF
====================================================== */
export const emailStoragePdf = async (req, res) => {
  try {
    const { storage_id } = req.params;

    const result = await pool.query(
      `
      SELECT
        sh.storage_no,
        c.fullname,
        c.email
      FROM storage_headers sh
      INNER JOIN customers c
        ON c.id = sh.customer_id
      WHERE sh.storage_id = $1
      `,
      [storage_id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Storage record not found",
      });
    }

    const row = result.rows[0];

    if (!row.email) {
      return res.status(400).json({
        message: "Customer email address is not set",
      });
    }

    const pdfBuffer = await generateStoragePdf(storage_id);

    await sendEmailWithAttachment({
      to: row.email,
      subject: `Storage Form ${row.storage_no}`,
      text: `Attached is your storage form ${row.storage_no}.`,
      buffer: pdfBuffer,
      filename: `${row.storage_no}.pdf`,
    });

    await logActivity({
      userId: req.user.id,
      branchId: req.user.branch_id,
      module: "STORAGE",
      action: "EMAIL",
      description: `Sent storage form ${row.storage_no} by email`,
      ipAddress: req.ip,
    });

    res.json({
      message: "Storage form emailed successfully",
    });
  } catch (error) {
    console.error("emailStoragePdf error:", error);

    res.status(500).json({
      message: "Failed to email storage form",
    });
  }
};
