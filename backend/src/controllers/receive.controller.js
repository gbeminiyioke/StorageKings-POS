import pool from "../config/db.js";
import { generateGRN } from "../services/grn.service.js";
import { updateStock } from "../services/inventory.service.js";
import { recordSupplierTransaction } from "../services/supplier.service.js";
import { logActivity } from "../utils/activityLogger.js";
import { getPurchaseReport } from "../services/purchaseReport.service.js";
import { reverseGRN } from "../services/reversal.service.js";
import { generateGRNPDF } from "../services/pdf.service.js";
import { generateGRNPDFBuffer } from "../services/pdf.service.js";
import { sendEmailWithAttachment } from "../services/email.service.js";

export const createReceiveItems = async (req, res) => {
  const { header, items, staff, post } = req.body;
  const user_id = req.user.id;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*====================================
      CHECK DUPLICATE INVOICE
    ======================================*/
    const invoiceCheck = await client.query(
      `SELECT 1 FROM receive_items WHERE supplier_id = $1 AND invoice_no = $2`,
      [header.supplier_id, header.invoice_no],
    );

    if (invoiceCheck.rows.length) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Invoice already exists for this supplier" });
    }

    /*========================================
      GENERATE GRN ONLY WHEN POSTING
    ==========================================*/
    let grn = null;

    if (post) {
      grn = await generateGRN(header.branch_id);
    }

    /*========================================
      INSERT THE RECEIVE HEADER
    ==========================================*/
    const receive = await client.query(
      `INSERT INTO receive_items (grn_no, invoice_no, branch_id,  supplier_id, receive_date, subtotal, discount, tax, other_charges, grand_total, amount_paid, outstanding, received_by, checked_by, storekeeper, created_by, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING receive_id`,
      [
        grn,
        header.invoice_no,
        Number(header.branch_id),
        Number(header.supplier_id),
        header.date,
        Number(header.subtotal),
        Number(header.discount),
        Number(header.tax),
        Number(header.other),
        Number(header.grand_total),
        Number(header.amount_paid),
        Number(header.outstanding),
        staff.received_by,
        staff.checked_by,
        staff.storekeeper,
        user_id,
        post ? "APPROVED" : "PENDING",
      ],
    );

    const receive_id = receive.rows[0].receive_id;

    /*========================================
      INSERT ITEMS
    ==========================================*/
    for (const item of items) {
      if (!item.product_id) continue;

      const validateProduct = await client.query(
        `SELECT 1 FROM products WHERE product_id = $1 AND deleted = false AND can_be_sold = true AND storage = false`,
        [item.product_id],
      );

      if (!validateProduct.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "One or more products are not allowed for receiving",
        });
      }

      await client.query(
        `INSERT INTO receive_item_details (receive_id, product_id, unit, quantity, cost_price, discount, tax, line_total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          receive_id,
          item.product_id,
          item.unit,
          item.qty,
          item.cost_price,
          item.discount,
          item.tax,
          item.line_total,
        ],
      );

      if (post) {
        await updateStock(client, {
          product_id: item.product_id,
          branch_id: header.branch_id,
          quantity: item.qty,
          reference_id: receive_id,
          user_id: user_id,
        });
      }
    }

    if (post) {
      await recordSupplierTransaction(client, {
        supplier_id: header.supplier_id,
        reference_id: receive_id,
        reference_no: grn,
        grand_total: header.grand_total,
        amount_paid: header.amount_paid,
        user_id: user_id,
      });
    }

    await logActivity({
      userId: user_id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "INVENTORY",
      action: "CREATE",
      description: `Created GRN ${grn}`,
      ipAddress: req.ip,
    });

    await client.query("COMMIT");

    let report = null;

    let responsePayload = {
      success: true,
      receive_id,
      grn,
      report: null,
    };

    if (post) {
      try {
        report = await getPurchaseReport(receive_id);

        //const pdfBuffer = await generateGRNPDFBuffer(receive_id);

        //GET SUPPLIER EMAIL
        const supplierRes = await pool.query(
          `SELECT email FROM suppliers WHERE id = $1`,
          [header.supplier_id],
        );

        responsePayload.report = report;
        responsePayload.supplier_email = supplierRes.rows[0]?.email || null;
      } catch (err) {
        console.error("Email failed", err.message);
      }
    }

    res.json(responsePayload);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Error saving GRN" });
  } finally {
    client.release();
  }
};

export const listReceiveItems = async (req, res) => {
  try {
    const { q, startDate, endDate, status } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = `SELECT r.*, s.supplier_name, b.branch_name FROM receive_items r JOIN suppliers s ON r.supplier_id = s.id JOIN branches b ON r.branch_id = b.branch_id WHERE r.receive_date >= CURRENT_DATE - INTERVAL '30 days'`;

    let countQuery = `SELECT COUNT(*) FROM receive_items r JOIN suppliers s ON r.supplier_id = s.id JOIN branches b ON r.branch_id = b.branch_id WHERE r.receive_date >= CURRENT_DATE - INTERVAL '30 days'`;

    const params = [];
    const conditions = [];

    /* ==== SEARCH ==== */
    if (q && q.trim() !== "") {
      params.push(`%${q}%`);
      conditions.push(
        `(s.supplier_name ILIKE $${params.length} OR b.branch_name ILIKE $${params.length} OR r.grn_no ILIKE $${params.length})`,
      );
    }

    /* ==== DATE FILTER ==== */
    if (startDate) {
      params.push(startDate);
      conditions.push(`r.receive_date >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`r.receive_date <= $${params.length}`);
    }

    /* ==== STATUS FILTER ==== */
    if (status && status !== "ALL") {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (conditions.length) {
      const whereClause = " AND " + conditions.join(" AND ");
      query += whereClause;
      countQuery += whereClause;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const dataParams = [...params, limit, offset];

    const data = await pool.query(query, dataParams);
    const countRes = await pool.query(countQuery, params);

    res.json({
      data: data.rows,
      total: Number(countRes.rows[0].count),
      page,
      pages: Math.ceil(countRes.rows[0].count / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading receive items" });
  }
};

export const getReceiveById = async (req, res) => {
  const { id } = req.params;

  const header = await pool.query(
    `SELECT * FROM receive_items WHERE receive_id = $1`,
    [id],
  );

  const items = await pool.query(
    `SELECT d.*, p.product_id, p.product_name, p.product_code, p.unit, COALESCE(pbb.stock_quantity, 0) AS stock_quantity, p.minimum_quantity, pbb.selling_price, (SELECT rid.cost_price FROM receive_item_details rid JOIN receive_items ri ON ri.receive_id = rid.receive_id WHERE rid.product_id = p.product_id ORDER BY ri.receive_date DESC LIMIT 1) as last_supplier_price FROM receive_item_details d JOIN products p ON d.product_id = p.product_id LEFT JOIN products_by_branch pbb ON pbb.product_id = d.product_id AND pbb.branch_id = (SELECT branch_id FROM receive_items WHERE receive_id = $1) WHERE d.receive_id = $1`,
    [id],
  );

  res.json({
    header: header.rows[0],
    items: items.rows.map((i) => ({
      ...i,
      qty: i.quantity,
    })),
  });
};

export const deleteReceive = async (req, res) => {
  const { id } = req.params;

  const rec = await pool.query(
    `SELECT status FROM receive_items WHERE receive_id = $1`,
    [id],
  );

  if (rec.rows[0].status === "APPROVED") {
    return res.status(400).json({ message: "Cannot delete approved record" });
  }

  await pool.query(`DELETE FROM receive_item_details WHERE receive_id = $1`, [
    id,
  ]);
  await pool.query(`DELETE FROM receive_items WHERE receive_id = $1`, [id]);

  res.json({ success: true });
};

export const reverseReceive = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*=======================================
      GET GRN NO
    =========================================*/
    const rec = await client.query(
      `SELECT grn_no FROM receive_items WHERE receive_id = $1`,
      [id],
    );

    const grn = rec.rows[0]?.grn_no;

    await reverseGRN(client, id, user_id);

    await logActivity({
      userId: user_id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "INVENTORY",
      action: "REVERSE",
      description: `Reversed GRN ${grn}`,
      ipAddress: req.ip,
    });

    await client.query("COMMIT");

    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

export const printReceive = async (req, res) => {
  try {
    const { id } = req.params;

    /* HEADER */
    const headerRes = await pool.query(
      `SELECT r.*, s.supplier_name, b.branch_name FROM receive_items r JOIN suppliers s ON r.supplier_id = s.id JOIN branches b ON r.branch_id = b.branch_id WHERE r.receive_id = $1`,
      [id],
    );

    /* ITEMS */
    const itemsRes = await pool.query(
      `SELECT d.*, p.product_name FROM receive_item_details d JOIN products p ON d.product_id = p.product_id WHERE d.receive_id = $1`,
      [id],
    );

    const data = {
      header: headerRes.rows[0],
      items: itemsRes.rows,
    };

    generateGRNPDF(res, data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating PDF" });
  }
};

export const sendGRNEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const header = await pool.query(
      `SELECT r.*, s.email FROM receive_items r JOIN suppliers s ON r.supplier_id = s.id WHERE r.receive_id = $1`,
      [id],
    );

    const grn = header.rows[0];

    if (!grn?.email) {
      return res.status(400).json({ message: "Supplier has no email" });
    }

    const pdfBuffer = await generateGRNPDFBuffer(id);

    await sendEmailWithAttachment({
      to: grn.email,
      subject: `GRN ${grn.grn_no}`,
      text: "Please find attached Goods Received Note.",
      buffer: pdfBuffer,
      filename: `GRN-${grn.grn_no}.pdf`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Email failed" });
  }
};

export const updateReceive = async (req, res) => {
  const { id } = req.params;
  const { header, items, staff, post } = req.body;
  const user_id = req.user.id;

  const client = await pool.connect();

  try {
    //CONSOLE LOG
    //console.log("UPDATE START:", { id, post });

    await client.query("BEGIN");
    //console.log("STEP 1: BEGIN TRANSACTON");
    /*========================================
      GET EXISTING RECORD
    ==========================================*/
    const existing = await client.query(
      `SELECT status, grn_no FROM receive_items WHERE receive_id = $1`,
      [id],
    );

    if (!existing.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "GRN not found" });
    }

    let currentStatus = existing.rows[0]?.status;
    let grn = existing.rows[0]?.grn_no;

    //console.log("STEP 2: EXISTING RECORD", existing.rows[0]);

    /*========================================
      GENERATE GRN IF POSTING
    ==========================================*/
    if (post && !grn) {
      //console.log("STEP 3: GENERATING GRN...");
      grn = await generateGRN(header.branch_id);
    }

    /*========================================
      UPDATE HEADER
    ==========================================*/
    //console.log("STEP 4: UPDATING HEADER");
    await client.query(
      `UPDATE receive_items SET grn_no = $1, invoice_no = $2, branch_id = $3, supplier_id = $4, receive_date = $5, subtotal = $6, discount = $7, tax = $8, other_charges = $9, grand_total = $10, amount_paid = $11, outstanding = $12, received_by = $13, checked_by = $14, storekeeper = $15, status = $16 WHERE receive_id = $17`,
      [
        grn,
        header.invoice_no,
        Number(header.branch_id),
        Number(header.supplier_id),
        header.date,
        Number(header.subtotal),
        Number(header.discount),
        Number(header.tax),
        Number(header.other),
        Number(header.grand_total),
        Number(header.amount_paid),
        Number(header.outstanding),
        staff.received_by,
        staff.checked_by,
        staff.storekeeper,
        post ? "APPROVED" : currentStatus,
        id,
      ],
    );

    /*========================================
        DELETE OLD ITEMS
    ==========================================*/
    //console.log("DELETE OLD ITEMS");
    await client.query(
      `DELETE FROM receive_item_details WHERE receive_id = $1`,
      [id],
    );

    /*========================================
      INSERT NEW ITEMS
    ==========================================*/
    //console.log("STEP 6: INSERT ITEMS");
    for (const item of items) {
      if (!item.product_id) continue;

      /* VALIDATE PRODUCT IS RECEIVABLE */
      const valdateProduct = await client.query(
        `SELECT 1 FROM products WHERE product_id = $1 AND deleted = false AND can_be_sold = true AND storage = false`,
        [item.product_id],
      );

      if (!validateProduct.rows.length) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "One or more products not allowed for receiving" });
      }

      //console.log("INSERTING ITEM:", item.product_id);
      await client.query(
        `INSERT INTO receive_item_details (receive_id, product_id, unit, quantity, cost_price, discount, tax, line_total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          item.product_id,
          item.unit,
          item.qty,
          item.cost_price,
          item.discount,
          item.tax,
          item.line_total,
        ],
      );

      /*========================================
        UPDATE STOCK IF POSTING
      ==========================================*/
      if (post && currentStatus !== "APPROVED") {
        //console.log("STEP 7: UPDATING STOCK FOR PRODUCT:", item.product_id);
        await updateStock(client, {
          product_id: item.product_id,
          branch_id: header.branch_id,
          quantity: item.qty,
          reference_id: id,
          user_id,
        });

        //console.log("STOCK UPDATED:", item.product_id);
      }
    }

    /*========================================
      SUPPLIER TRANSACTIONS
    ==========================================*/
    if (post) {
      //console.log("STEP 8: SUPPLIER TRANSACTION");
      await recordSupplierTransaction(client, {
        supplier_id: header.supplier_id,
        reference_id: id,
        reference_no: grn,
        grand_total: header.grand_total,
        amount_paid: header.amount_paid,
        user_id,
      });

      //console.log("SUPPLIER TRANSACTION DONE");
    }

    /*========================================
      LOG ACTIVITY
    ==========================================*/
    //console.log("STEP 9: LOG ACTIVITY");

    await logActivity({
      userId: user_id,
      userName: req.user.name,
      branchId: req.user.branch_id,
      module: "INVENTORY",
      action: post ? "POST_UPDATE" : "UPDATE",
      description: `Updated GRN ${grn}`,
      ipAddress: req.ip,
    });

    //console.log("STEP 10: COMMIT");

    await client.query("COMMIT");

    //console.log("UPDATE SUCCESS");

    res.json({
      success: true,
      grn,
      receive_id: id,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE RECEIVE ERROR:", err);
    res.status(500).json({ message: "Update failed" });
  } finally {
    client.release();
  }
};
