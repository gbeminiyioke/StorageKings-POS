import pool from "../config/db.js";
import logActivity from "../utils/activityLogger.js";
import bcrypt from "bcryptjs";

/* ===================================
  CREATE SUPPLIER
======================================*/
export const createCustomer = async (req, res) => {
  try {
    const {
      fullname,
      customer_type,
      sex,
      telephone,
      address_1,
      address_2,
      address_3,
      fax,
      email,
      password,
      website,
      contact_name,
      contact_telephone,
      current_balance,
      payment_terms,
      enable,
      whatsapp,
      ig,
      facebook,
    } = req.body;

    /* ======= VALIDATION ======= */
    if (!fullname || !customer_type || !password)
      return res.status(400).json({ message: "Required fields are missing" });

    if (customer_type === "Individual" && !sex)
      return res.status(400).json({ message: "Select sex" });

    if (!telephone) {
      return res.status(400).json({ message: "Telephone number is required" });
    }

    if (customer_type === "Coporate") {
      if (!contact_name || !contact_telephone) {
        return res.status(400).json({
          message: "Contact details are required for coporate customers",
        });
      }
    }

    const exists = await pool.query(
      "SELECT id FROM customers WHERE LOWER(fullname) = LOWER($1)",
      [fullname],
    );

    if (exists.rows.length) {
      return res.status(400).json({ message: "CUSTOMER_NAME_EXISTS" });
    }

    if (email) {
      const emailExists = await pool.query(
        "SELECT id FROM customers WHERE LOWER(email) = LOWER($1)",
        [email],
      );

      if (emailExists.rows.length) {
        return res.status(400).json({ message: "EMAIL_EXISTS" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO customers (fullname, customer_type, sex, telephone, address_1, address_2, address_3, fax, email, password, website, contact_name, contact_telephone, current_balance, payment_terms, enable, whatsapp, ig, facebook, selfcreated, createdatbranchid, createdbyuserid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING *`,
      [
        fullname,
        customer_type,
        sex || null,
        telephone,
        address_1 || null,
        address_2 || null,
        address_3 || null,
        fax || null,
        email || null,
        hashedPassword,
        website || null,
        contact_name || null,
        contact_telephone || null,
        current_balance || 0,
        payment_terms || 0,
        enable ?? true,
        whatsapp || null,
        ig || null,
        facebook || null,
        false,
        req.user.branch_id,
        req.user.id,
      ],
    );

    /* === ACTIVITY LOG === */
    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "CUSTOMER",
      action: "CREATE",
      description: `Created customer ${fullname}`,
      ipAddress: req.ip,
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create Customer Error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/*================================================
  GET CUSTOMER (SEARCH + PAGINATION)
==================================================*/
export const getCustomers = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const searchTerm = `%${search}%`;

    const result = await pool.query(
      `SELECT * FROM customers WHERE fullname ILIKE $1 OR customer_type ILIKE $1 OR telephone ILIKE $1 ORDER BY id DESC
      LIMIT $2 OFFSET $3`,
      [searchTerm, limit, offset],
    );

    const count = await pool.query(
      `SELECT COUNT (*) FROM customers WHERE fullname ILIKE $1 or customer_type ILIKE $1 or telephone ILIKE $1`,
      [searchTerm],
    );

    /* === ACTIVITY LOG === */
    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "CUSTOMER",
      action: "VIEW",
      description: `Viewed customers list`,
      ipAddress: req.ip,
    });

    res.json({
      data: result.rows,
      total: parseInt(count.rows[0].count),
    });
  } catch (err) {
    console.error("Get customers error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ========= UPDATE CUSTOMER ========= */
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query("SELECT * FROM customers WHERE id = $1", [
      id,
    ]);

    if (!existing.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (req.body.email) {
      const emailExists = await pool.query(
        "SELECT id FROM customers WHERE LOWER(email) = LOWER($1) AND id != $2",
        [req.body.email, id],
      );

      if (emailExists.rows.length) {
        return res.status(400).json({ message: "EMAIL_EXISTS" });
      }
    }

    const updated = await pool.query(
      `UPDATE customers SET fullname = $1, customer_type = $2, sex = $3, telephone = $4, address_1 = $5, address_2 = $6,address_3 = $7, fax = $8, email = $9, website = $10, contact_name = $11, contact_telephone = $12, current_balance = $13, payment_terms = $14, enable = $15, whatsapp = $16, ig = $17, facebook = $18, lasteditedon = NOW(), lasteditedby = $19 WHERE id = $20 RETURNING *`,
      [
        req.body.fullname,
        req.body.customer_type,
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
        req.user.id,
        id,
      ],
    );

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "CUSTOMER",
      action: "UPDATE",
      description: `Updated customer ${req.body.fullname}`,
      ipAddress: req.ip,
    });

    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Update customer error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================
 DELETE CUSTOMER
 ==============================================*/
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await pool.query(
      "SELECT fullname FROM customers WHERE id = $1",
      [id],
    );

    if (!customer.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    /*=== PREVENT DELETE IF CUSTOMER HAS TRANSACTIONS === */
    //const transactions = await pool.query(
    //  "SELECT id FROM purchases WHERE customer_id = $1 LIMIT 1",
    //  [id],
    //);

    //if (transactions.rows.length) {
    //  return res.status(400).json({
    //    message: "Cannot delete customer with existing transactions",
    //  });
    //}

    await pool.query(`DELETE FROM customers WHERE id = $1`, [id]);

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "CUSTOMER",
      action: "DELETE",
      description: `Deleted customer ${customer.rows[0].fullname}`,
      ipAddress: req.ip,
    });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete customer error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
