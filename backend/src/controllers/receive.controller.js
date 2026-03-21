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
        await updateStock({
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

    if (post) {
      try {
        report = await getPurchaseReport(receive_id);

        const pdfBuffer = await generateGRNPDFBuffer(receive_id);

        //GET SUPPLIER EMAIL
        const supplierRes = await pool.query(
          `SELECT email FROM suppliers WHERE id = $1`,
          [header.supplier_id],
        );

        const email = supplierRes.rows[0]?.email;

        if (email) {
          await sendEmailWithAttachment({
            to: email,
            subject: `GRN ${grn}`,
            text: "Please find attached Good Received Note.",
            buffer: pdfBuffer,
            filename: `GRN-${grn}.pdf`,
          });
        }
      } catch (err) {
        console.error("Email failed", err.message);
      }
    }

    res.json({
      success: true,
      receive_id,
      grn,
      report,
    });
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
    const { q, startDate, endDate, status, page = 1, limit = 10 } = req.query;

    page = Number(page);
    limit = Number(limit);
    const offset = (page - 1) * limit;

    let query = `SELECT r.*, s.supplier_name, b.branch_name FROM receive_items r JOIN suppliers s ON r.supplier_id = s.id JOIN branches b ON r.branch_id = b.branch_id WHERE r.receive_date >= CURRENT_DATE - INTERVAL '30 days'`;

    let countQuery = `SELECT COUNT(*) FROM receive_items r JOIN supplers s ON r.supplier_id = s.id JOIN branches b ON r.branch_id = b.branch_id WHERE r.recieve_date >= CURRENT_DATE - INTERVAL '30 days'`;

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
    params.push(limit, offset);

    const data = await pool.query(query, params);
    const countRes = await pool.query(countQuery, params.slice(0, 2));

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
    `SELECT * FROM receive_item_details WHERE receive_id = $1`,
    [id],
  );

  res.json({
    header: header.rows[0],
    items: items.rows,
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
