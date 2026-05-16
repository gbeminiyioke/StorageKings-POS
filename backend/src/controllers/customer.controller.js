import pool from "../config/db.js";
import logActivity from "../utils/activityLogger.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import crypto from "crypto";
import { sendEmail } from "../utils/mailer.js";

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
      indemnity_agreement_locked,
      warehouse_agreement_locked,
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

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
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

    const indemnityAgreement =
      req.files?.indemnity_agreement?.[0]?.path || null;

    const warehouseAgreement =
      req.files?.warehouse_agreement?.[0]?.path || null;

    const hashedPassword = await bcrypt.hash(password, 10);

    const isSelfCreated = !req.user;
    const createdBranchId = req.user?.branch_id || null;
    const createdByUserId = req.user?.id || null;

    const result = await pool.query(
      `INSERT INTO customers (fullname, customer_type, sex, telephone, address_1, address_2, address_3, fax, email, password, website, contact_name, contact_telephone, current_balance, payment_terms, enable, whatsapp, ig, facebook, indemnity_agreement, warehouse_agreement, indemnity_agreement_locked, warehouse_agreement_locked, selfcreated, createdatbranchid, createdbyuserid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26) RETURNING *`,
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
        indemnityAgreement,
        warehouseAgreement,
        indemnity_agreement_locked === "false",
        warehouse_agreement_locked === "false",
        isSelfCreated,
        createdBranchId,
        createdByUserId,
      ],
    );
    //userId: loginType === "staff" ? userId : null,
    /* === ACTIVITY LOG === */
    await logActivity({
      userId: req.user?.id || null,
      userName: req.user?.name || null,
      branchId: req.user?.branch_id || null,
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

    const indemnityAgreement = req.files?.indemnity_agreement?.[0];

    const warehouseAgreement = req.files?.warehouse_agreement?.[0];

    let indemnityPath = existing.rows[0].indemnity_agreement;

    let warehousePath = existing.rows[0].warehouse_agreement;

    /* replace old file */

    if (indemnityAgreement) {
      if (indemnityPath && fs.existsSync(indemnityPath)) {
        fs.unlinkSync(indemnityPath);
      }

      indemnityPath = indemnityAgreement.path;
    }

    if (warehouseAgreement) {
      if (warehousePath && fs.existsSync(warehousePath)) {
        fs.unlinkSync(warehousePath);
      }

      warehousePath = warehouseAgreement.path;
    }

    const updated = await pool.query(
      `UPDATE customers SET fullname = $1, customer_type = $2, sex = $3, telephone = $4, address_1 = $5, address_2 = $6,address_3 = $7, fax = $8, email = $9, website = $10, contact_name = $11, contact_telephone = $12, current_balance = $13, payment_terms = $14, enable = $15, whatsapp = $16, ig = $17, facebook = $18, indemnity_agreement = $19, warehouse_agreement = $20, indemnity_agreement_locked = $21, warehouse_agreement_locked = $22, lasteditedon = NOW(), lasteditedby = $23 WHERE id = $24 RETURNING *`,
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
        indemnityPath,
        warehousePath,
        req.body.indemnity_agreement_locked === "true",
        req.body.warehouse_agreement_locked === "true",
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

export const searchCustomers = async (req, res) => {
  try {
    const { q = "" } = req.query;

    if (!q.trim()) {
      return res.json({ data: [] });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        fullname,
        telephone,
        current_balance,
        payment_terms,
        email
      FROM customers
      WHERE enable = true
        AND (
          fullname ILIKE $1
          OR telephone ILIKE $1
          OR email ILIKE $1
        )
      ORDER BY fullname
      LIMIT 20
    `,
      [`%${q.trim()}%`],
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error("Customer search error:", err);
    res.status(500).json({ message: "Failed to search customers" });
  }
};

/* ==========================================
DOWNLOAD CUSTOMER PDF
========================================== */

export const downloadIndemnityAgreement = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
 SELECT
 indemnity_agreement,
 fullname
 FROM customers
 WHERE id=$1
 `,
      [id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const file = result.rows[0].indemnity_agreement;

    if (!file) {
      return res.status(404).json({
        message: "No indemnity agreement found",
      });
    }

    const filePath = path.join(process.cwd(), file.replace(/\\/g, "/"));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "File missing",
      });
    }

    return res.download(filePath, `${result.rows[0].fullname}-Indemnity.pdf`);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const downloadWarehouseAgreement = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
 SELECT
 warehouse_agreement,
 fullname
 FROM customers
 WHERE id=$1
 `,
      [id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const file = result.rows[0].warehouse_agreement;

    if (!file) {
      return res.status(404).json({
        message: "No warehouse agreement found",
      });
    }

    const filePath = path.join(process.cwd(), file.replace(/\\/g, "/"));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "File missing",
      });
    }

    return res.download(filePath, `${result.rows[0].fullname}-Warehouse.pdf`);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ======================================================
   CUSTOMER PORTAL SUMMARY
====================================================== */
export const getCustomerPortalSummary = async (req, res) => {
  try {
    const customerId = req.user.customer_id || req.user.id;

    /* =========================================
       STORED ITEMS
    ========================================= */
    const storedItems = await pool.query(
      `
      SELECT
        sh.storage_id,
        sh.storage_no,
        b.branch_name,
        p.product_name AS storage_space,
        sh.received_date,
        sh.status,
        sh.total_items,
        sh.discharge_date,
        sh.current_visits,
        sh.max_monthly_visits,
        sh.attachment_path,
        sh.storage_form_pdf,
        sh.created_at,

        (
          sh.discharge_date - CURRENT_DATE
        ) AS days_remaining,

        EXISTS (
          SELECT 1
          FROM storage_visit_requests svr
          WHERE svr.storage_id = sh.storage_id
            AND svr.request_status IN (
              'PENDING',
              'APPROVED'
            )
        ) AS has_pending_visit_request

      FROM storage_headers sh

      LEFT JOIN branches b
        ON sh.branch_id = b.branch_id

      LEFT JOIN products p
        ON sh.storage_space_product_id =
           p.product_id

      WHERE sh.customer_id = $1
        AND sh.deleted = FALSE
        AND sh.status IN (
          'ACTIVE',
          'PARTIAL'
        )

      ORDER BY sh.created_at DESC
    `,
      [customerId],
    );

    /* =========================================
       TRANSACTIONS
    ========================================= */
    const transactions = await pool.query(
      `
      SELECT
        created_at,
        transaction_type,
        reference_no,
        amount,
        status,
        branch_name
      FROM (

        SELECT
          ps.created_at,
          'SALE' AS transaction_type,

          COALESCE(
            ps.invoice_no,
            ps.proforma_no,
            ps.refund_no
          ) AS reference_no,
          ps.grand_total AS amount,
          ps.payment_status AS status,
          b.branch_name
        FROM pos_sales ps
        LEFT JOIN branches b
          ON ps.branch_id = b.branch_id
        WHERE ps.customer_id = $1

        UNION ALL

        SELECT
          sh.created_at,
          'STORAGE',
          sh.storage_no,
          0,
          sh.status,
          b.branch_name
        FROM storage_headers sh
        LEFT JOIN branches b
          ON sh.branch_id = b.branch_id
        WHERE sh.customer_id = $1
          AND sh.deleted = FALSE
        UNION ALL
        SELECT
          dh.created_at,
          'DISCHARGE',
          dh.discharge_no,
          0,
          dh.status,
          b.branch_name
        FROM discharge_headers dh
        LEFT JOIN branches b
          ON dh.branch_id = b.branch_id
        WHERE dh.customer_id = $1
      ) x

      ORDER BY created_at DESC
    `,
      [customerId],
    );

    /* =========================================
       PROFILE
    ========================================= */
    const profile = await pool.query(
      `
      SELECT
        id,
        fullname,
        email,
        telephone,
        whatsapp,
        ig,
        facebook,
        address_1,
        address_2,
        address_3,
        customer_type
      FROM customers
      WHERE id = $1
    `,
      [customerId],
    );

    /* =========================================
       NOTIFICATIONS
    ========================================= */
    const notifications = await pool.query(
      `
      SELECT
        *
      FROM storage_notifications
      WHERE customer_id = $1
        AND is_completed = FALSE
      ORDER BY created_at DESC
    `,
      [customerId],
    );

    res.json({
      storedItems: storedItems.rows,
      transactions: transactions.rows,
      notifications: notifications.rows,
      profile: profile.rows[0],
    });
  } catch (err) {
    console.error("Customer portal summary error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ======================================================
   STORAGE ITEMS DRILL DOWN
====================================================== */
export const getCustomerStorageItems = async (req, res) => {
  try {
    const customerId = req.user.customer_id || req.user.id;
    const { storageId } = req.params;

    const validate = await pool.query(
      `
      SELECT storage_id
      FROM storage_headers
      WHERE storage_id = $1
        AND customer_id = $2
    `,
      [storageId, customerId],
    );

    if (!validate.rows.length) {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    const result = await pool.query(
      `
      SELECT
        si.storage_item_id,
        p.product_name,
        si.condition,
        si.quantity,
        si.retrieved_quantity,
        si.remaining_quantity,
        sh.storage_no,
        p.product_code,
        ROW_NUMBER() OVER (
          PARTITION BY si.storage_item_id
          ORDER BY si.storage_item_id
        ) AS serial_no
      FROM storage_items si
      INNER JOIN products p
        ON si.product_id = p.product_id
      INNER JOIN storage_headers sh
        ON si.storage_id = sh.storage_id
      WHERE si.storage_id = $1
      ORDER BY p.product_name
    `,
      [storageId],
    );

    const formatted = result.rows.map((item) => ({
      ...item,
      generated_barcode: `${item.storage_no}/${item.product_code}/${String(item.serial_no).padStart(3, "0")}`,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Storage items error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   DOWNLOAD STORAGE ATTACHMENT
====================================================== */
export const downloadStorageAttachment = async (req, res) => {
  try {
    const customerId = req.user.customer_id || req.user.id;

    const { storageId } = req.params;

    const result = await pool.query(
      `
      SELECT
        storage_no,
        attachment_path
      FROM storage_headers
      WHERE storage_id = $1
        AND customer_id = $2
    `,
      [storageId, customerId],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Storage record not found",
      });
    }

    const attachment = result.rows[0].attachment_path;

    if (!attachment) {
      return res.status(404).json({
        message: "No attachment available",
      });
    }

    /* =========================================
       NORMALIZE FILE PATH
    ========================================= */

    const normalizedPath = attachment.replace(/\\/g, "/");

    /* =========================================
       BUILD ABSOLUTE PATH
    ========================================= */

    const filePath = path.join(process.cwd(), normalizedPath);

    console.log("DOWNLOAD PATH =", filePath);

    /* =========================================
       CHECK FILE EXISTS
    ========================================= */

    if (!fs.existsSync(filePath)) {
      console.error("FILE NOT FOUND:", filePath);

      return res.status(404).json({
        message: "Attachment file missing",
      });
    }

    /* =========================================
       DOWNLOAD FILE
    ========================================= */

    return res.download(filePath);
  } catch (err) {
    console.error("Download attachment error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ======================================================
   UPDATE OWN PROFILE
====================================================== */
export const updateOwnProfile = async (req, res) => {
  try {
    const customerId = req.user.customer_id || req.user.id;

    const updated = await pool.query(
      `
      UPDATE customers
      SET
        fullname = $1,
        telephone = $2,
        whatsapp = $3,
        ig = $4,
        facebook = $5,
        address_1 = $6,
        address_2 = $7,
        address_3 = $8
      WHERE id = $9
      RETURNING *
    `,
      [
        req.body.fullname,
        req.body.telephone,
        req.body.whatsapp,
        req.body.ig,
        req.body.facebook,
        req.body.address_1,
        req.body.address_2,
        req.body.address_3,
        customerId,
      ],
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   CREATE STORAGE VISIT REQUEST
====================================================== */
export const createStorageVisitRequest = async (req, res) => {
  try {
    const customerId = req.user.customer_id || req.user.id;

    const {
      storage_id,
      fullname,
      telephone,
      visit_date,
      visitors_name,
      visitors_telephone,
    } = req.body;

    if (
      !storage_id ||
      !fullname ||
      !telephone ||
      !visit_date ||
      !visitors_name ||
      !visitors_telephone
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    /* =====================================
         STORAGE DETAILS
      ===================================== */
    const storageResult = await pool.query(
      `
        SELECT
          sh.storage_id,
          sh.storage_no,
          sh.branch_id,
          sh.current_visits,
          sh.max_monthly_visits,
          b.branch_name,
          p.product_name AS storage_space,
          c.email

        FROM storage_headers sh

        LEFT JOIN branches b
          ON sh.branch_id = b.branch_id

        LEFT JOIN products p
          ON sh.storage_space_product_id =
             p.product_id

        LEFT JOIN customers c
          ON sh.customer_id = c.id

        WHERE sh.storage_id = $1
          AND sh.customer_id = $2
      `,
      [storage_id, customerId],
    );

    if (!storageResult.rows.length) {
      return res.status(404).json({
        message: "Storage record not found",
      });
    }

    const storage = storageResult.rows[0];

    /* =====================================
         CHECK QUOTA
      ===================================== */
    if (Number(storage.current_visits) >= Number(storage.max_monthly_visits)) {
      return res.status(400).json({
        message: "Monthly visit quota exhausted",
      });
    }

    /* =====================================
         CHECK EXISTING PENDING
      ===================================== */
    const existing = await pool.query(
      `
        SELECT visit_request_id
        FROM storage_visit_requests
        WHERE storage_id = $1
          AND request_status IN (
            'PENDING',
            'APPROVED'
          )
      `,
      [storage_id],
    );

    if (existing.rows.length) {
      return res.status(400).json({
        message: "There is already a pending visit request",
      });
    }

    /* =====================================
         GENERATE REQUEST NO
      ===================================== */
    const requestNo = `SVR-${Date.now()}`;

    /* =====================================
         QR PASS
      ===================================== */
    const qrPassCode = crypto.randomUUID();

    const qrImage = await QRCode.toDataURL(qrPassCode);

    /* =====================================
         INSERT REQUEST
      ===================================== */
    const insert = await pool.query(
      `
          INSERT INTO storage_visit_requests (
            request_no,
            storage_id,
            customer_id,
            branch_id,
            storage_no,
            customer_name,
            telephone,
            visit_date,
            visitors_name,
            visitors_telephone,
            qr_pass_code,
            qr_pass_image
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            $8,$9,$10,$11,$12
          )
          RETURNING *
        `,
      [
        requestNo,
        storage.storage_id,
        customerId,
        storage.branch_id,
        storage.storage_no,
        fullname,
        telephone,
        visit_date,
        visitors_name,
        visitors_telephone,
        qrPassCode,
        qrImage,
      ],
    );

    /* =====================================
         NOTIFICATION
      ===================================== */
    await pool.query(
      `
        INSERT INTO storage_notifications (
          customer_id,
          storage_id,
          visit_request_id,
          title,
          message,
          notification_type
        )
        VALUES (
          $1,$2,$3,$4,$5,$6
        )
      `,
      [
        customerId,
        storage.storage_id,
        insert.rows[0].visit_request_id,

        "Visit Request Submitted",

        `Your request to visit storage unit ${storage.storage_no} at the ${storage.branch_name} branch on ${visit_date} has been received and is being processed.`,

        "VISIT_REQUEST",
      ],
    );

    /* =====================================
         EMAIL
      ===================================== */
    if (storage.email) {
      await sendEmail({
        to: storage.email,

        subject: "Storage Visit Request Submitted",

        html: `
            <h2>Storage Visit Request</h2>

            <p>
              Your request to visit storage unit
              <strong>
                ${storage.storage_no}
              </strong>
              at the
              <strong>
                ${storage.branch_name}
              </strong>
              branch on
              <strong>
                ${visit_date}
              </strong>
              has been received.
            </p>

            <p>
              Your request is being processed.
            </p>
          `,
      });
    }

    res.status(201).json({
      message: "Visit request submitted successfully",
    });
  } catch (err) {
    console.error("Create visit request error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ======================================================
   GET CUSTOMER NOTIFICATIONS
====================================================== */
export const getCustomerNotifications = async (req, res) => {
  try {
    const customerId = req.user.customer_id || req.user.id;

    const result = await pool.query(
      `
        SELECT *
        FROM storage_notifications
        WHERE customer_id = $1
          AND is_completed = FALSE
        ORDER BY created_at DESC
      `,
      [customerId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Notifications error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ======================================================
   DELETE NOTIFICATION
====================================================== */
export const deleteNotification = async (req, res) => {
  try {
    const customerId = req.user.customer_id || req.user.id;

    const { id } = req.params;

    await pool.query(
      `
        UPDATE storage_notifications
        SET
          is_completed = TRUE
        WHERE notification_id = $1
          AND customer_id = $2
      `,
      [id, customerId],
    );

    res.json({
      message: "Notification removed",
    });
  } catch (err) {
    console.error("Delete notification error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ======================================================
   VIEW STORAGE FORM PDF
====================================================== */
export const viewStorageFormPdf = async (req, res) => {
  try {
    const customerId = req.user.customer_id || req.user.id;

    const { storageId } = req.params;

    const result = await pool.query(
      `
        SELECT
          storage_form_pdf
        FROM storage_headers
        WHERE storage_id = $1
          AND customer_id = $2
      `,
      [storageId, customerId],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Storage record not found",
      });
    }

    const file = result.rows[0].storage_form_pdf;

    if (!file) {
      return res.status(404).json({
        message: "Storage form PDF missing",
      });
    }

    const filePath = path.join(process.cwd(), file.replace(/\\/g, "/"));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "Storage form file missing",
      });
    }

    return res.sendFile(filePath);
  } catch (err) {
    console.error("View storage form error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};
