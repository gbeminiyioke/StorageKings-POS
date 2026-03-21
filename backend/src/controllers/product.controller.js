import { error } from "console";
import pool from "../config/db.js"; // PostgreSQL pool
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Ensure uploads folder exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// =============================
// Helper: save uploaded image
// =============================
const saveImage = (file) => {
  if (!file) return null;
  const timestamp = Date.now();
  const ext = path.extname(file.originalname);
  const filename = `${timestamp}-${file.originalname.replace(/\s/g, "_")}`;
  const uploadPath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(uploadPath, file.buffer);
  return `/uploads/${filename}`; // Return URL for frontend
};

// =============================
// CREATE PRODUCT
// =============================
export const createProduct = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      product_code,
      product_name,
      pos_name,
      category,
      unit,
      cost_price,
      selling_price,
      minimum_quantity,
      stock_quantity,
      monitor_stock,
      can_be_sold,
      packages,
    } = req.body;

    // 🔥 Get logged-in user (UUID)
    const created_by = req.user?.id;
    if (!created_by) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // =============================
    // Handle category
    // =============================
    let category_id = null;

    if (category) {
      const catResult = await client.query(
        "SELECT category_id FROM categories WHERE LOWER(category_name)=LOWER($1) LIMIT 1",
        [category],
      );

      if (catResult.rows.length) {
        category_id = catResult.rows[0].category_id;
      } else {
        const insertCat = await client.query(
          "INSERT INTO categories (category_name) VALUES ($1) RETURNING category_id",
          [category],
        );
        category_id = insertCat.rows[0].category_id;
      }
    }

    // =============================
    // Handle image
    // =============================
    let image_url = null;
    if (req.file) {
      image_url = saveImage(req.file);
    }

    // =============================
    // Insert product
    // =============================
    const productRes = await client.query(
      `INSERT INTO products
        (product_code, product_name, pos_name, category_id, unit, cost_price, selling_price, minimum_quantity, stock_quantity, monitor_stock, can_be_sold, image_url, packages, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        product_code,
        product_name,
        pos_name,
        category_id,
        unit,
        parseFloat(cost_price),
        parseFloat(selling_price),
        parseInt(minimum_quantity),
        parseInt(stock_quantity) || 0,
        monitor_stock === "true" || monitor_stock === true,
        can_be_sold === "true" || can_be_sold === true,
        image_url,
        packages ? JSON.stringify(packages) : null,
        created_by,
      ],
    );

    const product = productRes.rows[0];

    /*========================================
      INSERT PRODUCT INTO products_by_branch
    ==========================================*/
    const branches = await client.query(`SELECT branch_id FROM branches`);

    for (const branch of branches.rows) {
      (await client.query(
        `INSERT INTO products_by_branch (product_id, branch_id, selling_price, stock_quantity) VALUES ($1, $2, $3, $4)`,
      ),
        [
          product.product_id,
          branch.branch_id,
          parseFloat(selling_price),
          parseFloat(stock_quantity) || 0,
        ]);
    }

    await client.query("COMMIT");

    res.status(201).json(product);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to create product" });
  } finally {
    client.release();
  }
};

// =============================
// UPDATE PRODUCT
// =============================
export const updateProduct = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const product_id = req.params.id; // 🔥 make sure route uses :id

    if (!product_id) {
      return res.status(400).json({ message: "Product ID missing" });
    }

    const {
      product_code,
      product_name,
      pos_name,
      category,
      unit,
      cost_price,
      selling_price,
      minimum_quantity,
      stock_quantity,
      monitor_stock,
      can_be_sold,
      packages,
    } = req.body;

    const last_edited_by = req.user?.id;
    if (!last_edited_by) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // =============================
    // Handle category
    // =============================
    let category_id = null;

    if (category) {
      const catResult = await client.query(
        "SELECT category_id FROM categories WHERE LOWER(category_name)=LOWER($1) LIMIT 1",
        [category],
      );

      if (catResult.rows.length) {
        category_id = catResult.rows[0].category_id;
      } else {
        const insertCat = await pool.query(
          "INSERT INTO categories (category_name) VALUES ($1) RETURNING category_id",
          [category],
        );
        category_id = insertCat.rows[0].category_id;
      }
    }

    // =============================
    // Handle image
    // =============================
    let image_url = null;
    if (req.file) {
      image_url = saveImage(req.file);
    }

    const updateRes = await client.query(
      `UPDATE products SET
        product_code=$1,
        product_name=$2,
        pos_name=$3,
        category_id=$4,
        unit=$5,
        cost_price=$6,
        selling_price=$7,
        minimum_quantity=$8,
        stock_quantity=$9,
        monitor_stock=$10,
        can_be_sold=$11,
        image_url=COALESCE($12,image_url),
        packages=$13,
        last_edited_by=$14,
        last_edited_on=NOW()
       WHERE product_id=$15`,
      [
        product_code,
        product_name,
        pos_name,
        category_id,
        unit,
        parseFloat(cost_price),
        parseFloat(selling_price),
        parseInt(minimum_quantity),
        parseInt(stock_quantity) || 0,
        monitor_stock === "true" || monitor_stock === true,
        can_be_sold === "true" || can_be_sold === true,
        image_url,
        packages ? JSON.stringify(packages) : null,
        last_edited_by,
        product_id,
      ],
    );

    if (updateRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Product not found" });
    }

    /*============================================
      AUTO PRICE SYNC ACROSS BRANCHES
    ==============================================*/
    await client.query(
      `UPDATE products_by_branch SET selling_price = $1 WHERE product_id = $2 AND auto_price_sync = true`,
      [parseFloat(selling_price), product_id],
    );

    /*============================================
      ENSURE PRODUCT EXISTS IN products_by_branch
    ==============================================*/
    const branches = await client.query(`SELECT branch_id FROM branches`);

    for (const branch of branches.rows) {
      const exists = await client.query(
        `SELECT 1 FROM products_by_branch WHERE product_id = $1 AND branch_id = $2`,
        [product_id, branch.branch_id],
      );

      if (!exists.rows.length) {
        await client.query(
          `INSERT INTO products_by_branch (product_id, branch_id, selling_price, stock_quantity) VALUES ($1, $2, $3, $4)`,
          [
            product_id,
            branch.branch_id,
            parseFloat(selling_price),
            parseFloat(stock_quantity) || 0,
          ],
        );
      }
    }

    await client.query("COMMIT");

    // return updated row fresh
    const refreshed = await client.query(
      `SELECT p.*, c.category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id=c.category_id
       WHERE p.product_id=$1`,
      [product_id],
    );

    res.json(refreshed.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to update product" });
  } finally {
    client.release();
  }
};

// =============================
// GET PRODUCTS
// =============================
export const getProducts = async (req, res) => {
  try {
    const { page = 1, search = "" } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT p.*, c.category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id=c.category_id
       WHERE LOWER(p.product_name) LIKE $1 OR LOWER(c.category_name) LIKE $1
       ORDER BY p.product_id DESC
       LIMIT $2 OFFSET $3`,
      [`%${search.toLowerCase()}%`, limit, offset],
    );

    const totalRes = await pool.query(
      `SELECT COUNT(*) FROM products p
       LEFT JOIN categories c ON p.category_id=c.category_id
       WHERE LOWER(p.product_name) LIKE $1 OR LOWER(c.category_name) LIKE $1`,
      [`%${search.toLowerCase()}%`],
    );

    res.json({
      data: result.rows,
      total: parseInt(totalRes.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// =============================
// GET SINGLE PRODUCT
// =============================
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, c.category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id=c.category_id
       WHERE p.product_id=$1`,
      [id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

// =============================
// DELETE PRODUCT
// =============================
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM products WHERE product_id=$1", [id]);
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete product" });
  }
};

// =============================
// GET CATEGORIES
// =============================
export const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM categories ORDER BY category_name",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

export const getProductsByBarcode = async (req, res) => {
  try {
    const { product_code } = req.params;
    const { branch_id } = req.query;

    const result = await pool.query(
      `SELECT p.product_id, p.product_code, p.product_name, p.unit, p.pos_name, p.cost_price, p.selling_price, p.minimum_quantity, COALESCE(pbb.stock_quantity, 0) AS stock_quantity, (SELECT rid.cost_price FROM receive_item_details rid JOIN receive_items ri ON ri.receive_id = rid.receive_id WHERE rid.product_id = p.product_id ORDER BY ri.receive_date DESC LIMIT 1) as last_supplier_price, (SELECT ri.receive_date FROM receive_item_details rid JOIN receive_items ri ON ri.receive_id = rid.receive_id WHERE rid.product_id = p.product_id ORDER BY ri.receive_date DESC LIMIT 1) as last_purchase_date FROM products p LEFT JOIN products_by_branch pbb ON pbb.product_id = p.product_id AND pbb.branch_id = $2 WHERE product_code = $1 AND p.can_be_sold = true AND p.deleted = false`,
      [product_code, branch_id],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Product not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Barcode lookup error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/*==============================================
  SEARCH PRODUCTS BY NAME
================================================*/
export const searchProducts = async (req, res) => {
  try {
    let { q } = req.query;

    if (!q || q === "NaN") {
      return res.json({ data: [] });
    }

    q = q.trim();

    const result = await pool.query(
      `SELECT product_id, product_name, product_code, pos_name, unit, cost_price FROM products WHERE deleted = false AND product_name ILIKE $1 ORDER BY product_name LIMIT 20`,
      [`%${q}%`],
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error("Product search error:", err);
    res.status(500).json({ message: "Search failed" });
  }
};
