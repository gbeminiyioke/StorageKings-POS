import pool from "../config/db.js";
import logActivity from "../utils/activityLogger.js";

/* ===================================
  CREATE SUPPLIER
======================================*/
export const createSupplier = async (req, res) => {
  try {
    const {
      supplier_name,
      supplier_type,
      sex,
      telephone,
      address_1,
      address_2,
      address_3,
      fax,
      email,
      website,
      contact_name,
      contact_telephone,
      current_balance,
      payment_terms,
      enable,
      whatsapp,
      ig,
      facebook,
      next_of_kin,
      next_of_kin_telephone,
      image_url,
    } = req.body;

    if (!supplier_name || !supplier_type) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    if (supplier_type === "Individual" && !sex) {
      return res.status(400).json({ message: "Select sex" });
    }

    if (!telephone) {
      return res.status(400).json({ message: "Telephone number is required" });
    }

    if (supplier_type === "Coporate") {
      if (!contact_name || !contact_telephone) {
        return res.status(400).json({
          message: "Contact details are required for coporate suppliers",
        });
      }
    }

    const exists = await pool.query(
      "SELECT id FROM suppliers WHERE LOWER(supplier_name) = LOWER($1)",
      [supplier_name],
    );

    if (exists.rows.length) {
      return res.status(400).json({ message: "SUPPLIER_NAME_EXISTS" });
    }

    const result = await pool.query(
      `INSERT INTO suppliers (
        supplier_name,
        supplier_type,
        sex,
        telephone,
        address_1,
        address_2,
        address_3,
        fax,
        email,
        website,
        contact_name,
        contact_telephone,
        current_balance,
        payment_terms,
        enable,
        whatsapp,
        ig,
        facebook,
        next_of_kin,
        next_of_kin_telephone,
        image_url,
        created_by
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
      )
      RETURNING *`,
      [
        supplier_name,
        supplier_type,
        sex || null,
        telephone,
        address_1 || null,
        address_2 || null,
        address_3 || null,
        fax || null,
        email || null,
        website || null,
        contact_name || null,
        contact_telephone || null,
        current_balance || 0,
        payment_terms || 0,
        enable ?? true,
        whatsapp || null,
        ig || null,
        facebook || null,
        next_of_kin || null,
        next_of_kin_telephone || null,
        image_url || null,
        req.user.id,
      ],
    );

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "INVENTORY",
      action: "CREATE",
      description: `Created supplier ${supplier_name}`,
      ipAddress: req.ip,
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create Supplier Error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/*================================================
  GET SUPPLIERS (SEARCH + PAGINATION)
==================================================*/
export const getSuppliers = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    const searchTerm = `%${search}%`;

    const result = await pool.query(
      `SELECT *
       FROM suppliers
       WHERE supplier_name ILIKE $1
          OR supplier_type ILIKE $1
          OR telephone ILIKE $1
       ORDER BY id DESC
       LIMIT $2 OFFSET $3`,
      [searchTerm, limitNumber, offset],
    );

    const count = await pool.query(
      `SELECT COUNT(*) 
       FROM suppliers
       WHERE supplier_name ILIKE $1
          OR supplier_type ILIKE $1
          OR telephone ILIKE $1`,
      [searchTerm],
    );

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "INVENTORY",
      action: "VIEW",
      description: "Viewed suppliers list",
      ipAddress: req.ip,
    });

    res.json({
      data: result.rows,
      total: Number(count.rows[0].count),
    });
  } catch (err) {
    console.error("Get suppliers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ========= UPDATE SUPPLIER ========= */
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query("SELECT * FROM suppliers WHERE id = $1", [
      id,
    ]);

    if (!existing.rows.length) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const updated = await pool.query(
      `UPDATE suppliers SET
        supplier_name = $1,
        supplier_type = $2,
        sex = $3,
        telephone = $4,
        address_1 = $5,
        address_2 = $6,
        address_3 = $7,
        fax = $8,
        email = $9,
        website = $10,
        contact_name = $11,
        contact_telephone = $12,
        current_balance = $13,
        payment_terms = $14,
        enable = $15,
        whatsapp = $16,
        ig = $17,
        facebook = $18,
        next_of_kin = $19,
        next_of_kin_telephone = $20,
        image_url = $21,
        updated_at = NOW(),
        last_edited_by = $22
      WHERE id = $23
      RETURNING *`,
      [
        req.body.supplier_name,
        req.body.supplier_type,
        req.body.sex || null,
        req.body.telephone,
        req.body.address_1 || null,
        req.body.address_2 || null,
        req.body.address_3 || null,
        req.body.fax || null,
        req.body.email || null,
        req.body.website || null,
        req.body.contact_name || null,
        req.body.contact_telephone || null,
        req.body.current_balance || 0,
        req.body.payment_terms || 0,
        req.body.enable ?? true,
        req.body.whatsapp || null,
        req.body.ig || null,
        req.body.facebook || null,
        req.body.next_of_kin || null,
        req.body.next_of_kin_telephone || null,
        req.body.image_url || null,
        req.user.id,
        id,
      ],
    );

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "INVENTORY",
      action: "UPDATE",
      description: `Updated supplier ${req.body.supplier_name}`,
      ipAddress: req.ip,
    });

    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Update supplier error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================
 DELETE SUPPLIER
==============================================*/
export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await pool.query(
      "SELECT supplier_name FROM suppliers WHERE id = $1",
      [id],
    );

    if (!supplier.rows.length) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    await pool.query("DELETE FROM suppliers WHERE id = $1", [id]);

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "INVENTORY",
      action: "DELETE",
      description: `Deleted supplier ${supplier.rows[0].supplier_name}`,
      ipAddress: req.ip,
    });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete supplier error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getSupplierBalance = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT current_balance FROM suppliers WHERE id = $1`,
      [id],
    );

    res.json({ balance: result.rows[0]?.current_balance || 0 });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch supplier balance" });
  }
};
