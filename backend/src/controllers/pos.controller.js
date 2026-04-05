import pool from "../config/db.js";
import { completeSaleService } from "../services/pos.service.js";
import { generateInvoicePdf } from "../services/invoicePdf.service.js";
import { sendEmailWithAttachment } from "../services/email.service.js";

/*========================================
  GENERATE DOCUMENT NUMBER FROM BRANCH
==========================================*/
export const generateDocumentNumber = async (req, res) => {
  try {
    const { type } = req.params;
    const branch_id = req.user?.branchId || req.user?.branch_id;

    if (!branch_id) {
      return res.status(400).json({
        message: "User branch is missing",
      });
    }

    const branchRes = await pool.query(
      `
      SELECT
        branch_prefix,
        COALESCE(next_pos_no, 1) AS next_pos_no,
        COALESCE(next_proforma_no, 1) AS next_proforma_no,
        COALESCE(next_refund_no, 1) AS next_refund_no
      FROM branches
      WHERE branch_id = $1
      `,
      [branch_id],
    );

    if (!branchRes.rows.length) {
      return res.status(404).json({
        message: "Branch not found",
      });
    }

    const branch = branchRes.rows[0];
    const prefix = branch.branch_prefix || "X";

    let nextNumber = 1;
    let label = "";

    switch (type) {
      case "INVOICE":
        nextNumber = Number(branch.next_pos_no || 1);
        label = "S";
        break;

      case "PROFORMA":
        nextNumber = Number(branch.next_proforma_no || 1);
        label = "P";
        break;

      case "REFUND":
        nextNumber = Number(branch.next_refund_no || 1);
        label = "R";
        break;

      default:
        return res.status(400).json({
          message: "Invalid document type",
        });
    }

    const formattedNumber = `${label}${prefix}-${String(nextNumber).padStart(6, "0")}`;

    return res.json({
      number: formattedNumber,
    });
  } catch (err) {
    console.error("generateDocumentNumber error:", err);

    return res.status(500).json({
      message: err.message || "Failed to generate reference number",
    });
  }
};

/*===================================================
  COMPLETE SALE
=====================================================*/
export const completeSale = async (req, res) => {
  try {
    const result = await completeSaleService({
      ...req.body,
      branch_id: req.user.branchId,
      user_id: req.user.id,
    });

    if (req.body.email_invoice && req.body.customer_id) {
      const customerRes = await pool.query(
        `SELECT fullname, email FROM customers WHERE id = $1`,
        [req.body.customer_id],
      );

      const customer = customerRes.rows[0];

      if (customer?.email) {
        const invoiceRes = await pool.query(
          `
          SELECT
            ps.*,
            c.fullname,
            c.address_1,
            c.address_2,
            c.telephone,
            br.branch_name,
            br.branch_address,
            br.branch_telephone,
            br.branch_email,
            bs.business_name
          FROM pos_sales ps
          LEFT JOIN customers c ON c.id = ps.customer_id
          LEFT JOIN branches br ON br.branch_id = ps.branch_id
          LEFT JOIN business bs ON bs.business_id = br.business_id
          WHERE ps.sale_id = $1
          `,
          [result.sale_id],
        );

        const itemsRes = await pool.query(
          `
          SELECT
            d.*,
            p.product_name
          FROM pos_sale_details d
          JOIN products p ON p.product_id = d.product_id
          WHERE d.sale_id = $1
          ORDER BY d.id
          `,
          [result.sale_id],
        );

        const sale = invoiceRes.rows[0];
        const items = itemsRes.rows;

        const invoiceNo = sale.invoice_no || sale.proforma_no || sale.refund_no;

        const emailText = `Dear ${customer.fullname},

Please find attached your ${req.body.transaction_type.toLowerCase()} ${invoiceNo}.

Thank you for choosing us.

StorageKings POS`;

        const pdfBuffer = await generateInvoicePdf({
          sale,
          items,
        });

        await sendEmailWithAttachment({
          to: customer.email,
          subject: `${req.body.transaction_type} ${invoiceNo}`,
          text: emailText,
          buffer: pdfBuffer,
          filename: `${invoiceNo}.pdf`,
        });

        result.email_sent = true;
      } else {
        result.email_sent = false;
        result.email_message = "Customer does not have an email address set";
      }
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getSaleInvoice = async (req, res) => {
  try {
    const { sale_id } = req.params;

    const saleRes = await pool.query(
      `
      SELECT
        ps.*,
        c.fullname,
        c.address_1,
        c.address_2,
        c.telephone,
        br.branch_name,
        br.branch_address,
        br.branch_telephone,
        br.branch_email,
        bs.business_name
      FROM pos_sales ps
      LEFT JOIN customers c ON c.id = ps.customer_id
      LEFT JOIN branches br ON br.branch_id = ps.branch_id
      LEFT JOIN business bs ON bs.business_id = br.business_id
      WHERE ps.sale_id = $1

      `,
      [sale_id],
    );

    if (!saleRes.rows.length) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const itemsRes = await pool.query(
      `
      SELECT
        d.*, p.product_name
      FROM pos_sale_details d
      JOIN products p ON p.product_id = d.product_id
      WHERE d.sale_id = $1
      ORDER BY d.id
      `,
      [sale_id],
    );

    res.json({
      sale: saleRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (err) {
    console.error("getSaleInvoice error", err);
    res.status(500).json({ message: "Failed to load invoice" });
  }
};
