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
  try {
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
      const catResult = await pool.query(
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

    // =============================
    // Insert product
    // =============================
    const productRes = await pool.query(
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

    res.status(201).json(productRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create product" });
  }
};

// =============================
// UPDATE PRODUCT
// =============================
export const updateProduct = async (req, res) => {
  try {
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
      const catResult = await pool.query(
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

    const updateRes = await pool.query(
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
      return res.status(404).json({ message: "Product not found" });
    }

    // return updated row fresh
    const refreshed = await pool.query(
      `SELECT p.*, c.category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id=c.category_id
       WHERE p.product_id=$1`,
      [product_id],
    );

    res.json(refreshed.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update product" });
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
