import pool from "../config/db.js";
import logActivity from "../utils/activityLogger.js";
import { sendEmailWithAttachment } from "../services/email.service.js";
import { generateStoragePdf } from "../services/storagePdf.service.js";

/* ======================================================
   SEARCH CUSTOMERS FOR STORAGE PAGE
====================================================== */
export const searchStorageCustomers = async (req, res) => {
  try {
    const { q = "" } = req.query;

    if (!q.trim()) {
      return res.json([]);
    }

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
      [`%${q.trim()}%`],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("searchStorageCustomers error:", err);
    res.status(500).json({ message: "Failed to search customers" });
  }
};

/* ======================================================
   GET BRANCHES ASSIGNED TO LOGGED IN USER
====================================================== */
export const getUserBranches = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        b.branch_id,
        b.branch_name,
        b.branch_prefix
      FROM user_branches ub
      INNER JOIN branches b
        ON b.branch_id = ub.branch_id
      WHERE ub.user_id = $1
        AND b.enable = true
      ORDER BY b.branch_name
      `,
      [req.user.id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("getUserBranches error:", err);
    res.status(500).json({ message: "Failed to load branches" });
  }
};

/* ======================================================
   GET STORAGE SPACE PRODUCTS
====================================================== */
export const getStorageSpaces = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        product_id,
        product_name
      FROM products
      WHERE deleted = false
        AND storage = true
      ORDER BY product_name
      `,
    );

    res.json(result.rows);
  } catch (err) {
    console.error("getStorageSpaces error:", err);
    res.status(500).json({ message: "Failed to load storage spaces" });
  }
};

/* ======================================================
   SEARCH STORAGE PRODUCTS
====================================================== */
export const searchStorageProducts = async (req, res) => {
  try {
    const { q = "" } = req.query;

    if (!q.trim()) {
      return res.json([]);
    }

    const result = await pool.query(
      `
      SELECT
        p.product_id,
        p.product_code,
        p.product_name,
        p.image_url,
        COALESCE(c.category_name, '') AS category_name
      FROM products p
      LEFT JOIN categories c
        ON c.category_id = p.category_id
      WHERE p.deleted = false
        AND p.can_be_sold = false
        AND (
          p.product_name ILIKE $1
          OR p.product_code ILIKE $1
        )
      ORDER BY p.product_name
      LIMIT 20
      `,
      [`%${q.trim()}%`],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("searchStorageProducts error:", err);
    res.status(500).json({ message: "Failed to search products" });
  }
};

/* ======================================================
   GET PRODUCT BY BARCODE / PRODUCT CODE
====================================================== */
export const getStorageProductByBarcode = async (req, res) => {
  try {
    const { product_code } = req.params;

    const result = await pool.query(
      `
      SELECT
        p.product_id,
        p.product_code,
        p.product_name,
        p.image_url,
        COALESCE(c.category_name, '') AS category_name
      FROM products p
      LEFT JOIN categories c
        ON c.category_id = p.category_id
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
  } catch (err) {
    console.error("getStorageProductByBarcode error:", err);
    res.status(500).json({ message: "Failed to load product" });
  }
};

/* ======================================================
   GENERATE NEXT STORAGE NUMBER
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

    if (!result.rows.length) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const { branch_prefix, next_storage_no } = result.rows[0];

    res.json({
      storage_no: `SG${branch_prefix}-${String(next_storage_no).padStart(8, "0")}`,
    });
  } catch (err) {
    console.error("getNextStorageNo error:", err);
    res.status(500).json({ message: "Failed to generate storage number" });
  }
};

/* ======================================================
   CREATE STORAGE TRANSACTION
====================================================== */
export const createStorage = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      customer_id,
      branch_id,
      storage_space_product_id,
      received_date,
      received_notes,
      staff_signature,
      customer_signature,
      items,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ message: "Customer is required" });
    }

    if (!branch_id) {
      return res.status(400).json({ message: "Branch is required" });
    }

    if (!received_date) {
      return res.status(400).json({ message: "Received date is required" });
    }

    if (!items || !items.length) {
      return res
        .status(400)
        .json({ message: "At least one product is required" });
    }

    const branchResult = await client.query(
      `
      SELECT branch_prefix, next_storage_no
      FROM branches
      WHERE branch_id = $1
      FOR UPDATE
      `,
      [branch_id],
    );

    if (!branchResult.rows.length) {
      throw new Error("Branch not found");
    }

    const branch = branchResult.rows[0];
    const storage_no = `SG${branch.branch_prefix}-${String(branch.next_storage_no).padStart(8, "0")}`;

    const headerResult = await client.query(
      `
      INSERT INTO storage_headers (
        storage_no,
        customer_id,
        branch_id,
        storage_space_product_id,
        received_date,
        received_notes,
        staff_signature,
        customer_signature,
        total_items,
        created_by,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ACTIVE'
      )
      RETURNING *
      `,
      [
        storage_no,
        customer_id,
        branch_id,
        storage_space_product_id || null,
        received_date,
        received_notes || null,
        staff_signature || null,
        customer_signature || null,
        items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        req.user.id,
      ],
    );

    const storageHeader = headerResult.rows[0];

    for (const item of items) {
      const quantity = Number(item.quantity || 0);

      if (quantity <= 0) continue;

      const insertedItem = await client.query(
        `
        INSERT INTO storage_items (
          storage_id,
          product_id,
          quantity,
          condition
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *
        `,
        [
          storageHeader.storage_id,
          item.product_id,
          quantity,
          item.condition || "Good",
        ],
      );

      const existingBranchStock = await client.query(
        `
        SELECT stock_quantity
        FROM products_by_branch
        WHERE product_id = $1
          AND branch_id = $2
        FOR UPDATE
        `,
        [item.product_id, branch_id],
      );

      if (!existingBranchStock.rows.length) {
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
          VALUES ($1,$2,0,$3,true,0)
          `,
          [item.product_id, branch_id, quantity],
        );
      } else {
        const currentQty = Number(
          existingBranchStock.rows[0].stock_quantity || 0,
        );
        const newQty = currentQty + quantity;

        await client.query(
          `
          UPDATE products_by_branch
          SET stock_quantity = $1
          WHERE product_id = $2
            AND branch_id = $3
          `,
          [newQty, item.product_id, branch_id],
        );
      }

      const stockAfterResult = await client.query(
        `
        SELECT stock_quantity
        FROM products_by_branch
        WHERE product_id = $1
          AND branch_id = $2
        `,
        [item.product_id, branch_id],
      );

      const balanceAfter = Number(
        stockAfterResult.rows[0]?.stock_quantity || 0,
      );

      await client.query(
        `
        INSERT INTO stock_movements (
          product_id,
          branch_id,
          movement_type,
          quantity,
          reference_id,
          reference_table,
          created_by,
          balance_after,
          created_at
        )
        VALUES (
          $1,$2,'STORAGE_RECEIVE',$3,$4,'storage_headers',$5,$6,NOW()
        )
        `,
        [
          item.product_id,
          branch_id,
          quantity,
          storageHeader.storage_id,
          req.user.id,
          balanceAfter,
        ],
      );
    }

    await client.query(
      `
      UPDATE branches
      SET next_storage_no = next_storage_no + 1
      WHERE branch_id = $1
      `,
      [branch_id],
    );

    await client.query("COMMIT");

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      branchId: branch_id,
      module: "STORAGE",
      action: "CREATE",
      description: `Created storage transaction ${storage_no}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: "Storage saved successfully",
      storage_id: storageHeader.storage_id,
      storage_no,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createStorage error:", err);
    res.status(500).json({ message: "Failed to save storage" });
  } finally {
    client.release();
  }
};

/* ======================================================
   GET RECENT STORAGE LIST (LAST 30 DAYS)
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
        b.branch_name,
        c.fullname AS customer_name,
        c.email
      FROM storage_headers sh
      INNER JOIN customers c
        ON c.id = sh.customer_id
      INNER JOIN branches b
        ON b.branch_id = sh.branch_id
      WHERE sh.received_date >= CURRENT_DATE - INTERVAL '30 days'
        AND sh.deleted = false
      ORDER BY sh.storage_id DESC
      `,
    );

    res.json(result.rows);
  } catch (err) {
    console.error("getRecentStorages error:", err);
    res.status(500).json({ message: "Failed to load recent storages" });
  }
};

/* ======================================================
   EMAIL STORAGE PDF
====================================================== */
export const emailStoragePdf = async (req, res) => {
  try {
    const { storage_id } = req.params;

    const result = await pool.query(
      `
      SELECT
        sh.storage_no,
        c.email,
        c.fullname
      FROM storage_headers sh
      INNER JOIN customers c
        ON c.id = sh.customer_id
      WHERE sh.storage_id = $1
      `,
      [storage_id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Storage record not found" });
    }

    const row = result.rows[0];

    if (!row.email) {
      return res.status(400).json({ message: "Customer has no email address" });
    }

    const pdfBuffer = await generateStoragePdf(storage_id);

    await sendEmailWithAttachment({
      to: row.email,
      subject: `Storage Receipt ${row.storage_no}`,
      text: `Hello ${row.fullname}, attached is your storage receipt ${row.storage_no}.`,
      buffer: pdfBuffer,
      filename: `${row.storage_no}.pdf`,
    });

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "STORAGE",
      action: "EMAIL",
      description: `Emailed storage receipt ${row.storage_no}`,
      ipAddress: req.ip,
    });

    res.json({ message: "Storage PDF emailed successfully" });
  } catch (err) {
    console.error("emailStoragePdf error:", err);
    res.status(500).json({ message: "Failed to send storage PDF" });
  }
};

export const downloadStoragePdf = async (req, res) => {
  try {
    const { storage_id } = req.params;

    const pdfBuffer = await generateStoragePdf(storage_id);

    const result = await pool.query(
      `SELECT storage_no FROM storage_headers WHERE storage_id = $1`,
      [storage_id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Storage record not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${result.rows[0].storage_no}.pdf"`,
    );

    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate storage PDF" });
  }
};

export const getStorageItems = async (req, res) => {
  try {
    const { storage_id } = req.params;

    const result = await pool.query(
      `
      SELECT
        p.product_name,
        si.quantity
      FROM storage_items si
      INNER JOIN products p ON p.product_id = si.product_id
      WHERE si.storage_id = $1
      ORDER BY si.storage_item_id
      `,
      [storage_id],
    );

    res.json({ items: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load storage items" });
  }
};
