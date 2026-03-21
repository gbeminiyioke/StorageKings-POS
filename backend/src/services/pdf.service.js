import PDFDocument, { ellipse, fontSize, text } from "pdfkit";
import pool from "../config/db.js";
import { width } from "pdfkit/js/page";
import QRCode from "qrcode";
import logo from "../../../frontend/src/assets/logo-storagekings.png";

/*==============================================
  GENERATE GRN PDF
================================================*/
export const generateGRNPDF = async (receive_id, res) => {
  try {
    /*===========================================
      FETCH FULL REPORT DATA
    =============================================*/
    const reportQuery = `SELECT r.*, s.supplier_name, s.telephone AS supplier_phone, b.branch_name, branch_address, branch_telephone, bus.business_name FROM receive_items r JOIN suppliers s ON r.supplier_id = s.id JOIN branches b ON r.branch_id = b.branch_id JOIN business bus ON b.business_id = bus.business_id WHERE r.receive_id = $1`;

    const itemsQuery = `SELECT d.*, p.product_name FROM receive_items_details d JOIN products p ON d.product_id = p.product_id WHERE d.receive_id = $1`;

    const reportRes = await pool.query(reportQuery, [receive_id]);
    const itemsRes = await pool.query(itemsQuery, [receive_id]);

    if (!reportRes.rows.length) {
      return res.status(404).json({ message: "GRN not found" });
    }

    const header = reportRes.rows[0];
    const items = itemsRes.rows;

    /*==================================================
      CREATE PDF
    ====================================================*/
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    /*============================================
      RESPONSE HEADERS
    ==============================================*/
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=GRN-${header.grn_no}.pdf`,
    );

    doc.pipe(res);

    /*============================================
      MULTI COPY PRINT
    ==============================================*/
    const copies = ["ORIGINAL", "STORE COPY", "ACCOUNTS COPY"];

    for (let copyIndex = 0; copyIndex < copies.length; copyIndex++) {
      if (copyIndex > 0) doc.addPage();

      await drawHeader(doc, header, copies[copyIndex]);
      await drawQR(doc, header);
      drawDetails(doc, header);
      drawTable(doc, items);
      drawTotals(doc, header);
      drawSignatures(doc);
      drawFooter(doc, header);
      drawWatermark(doc, header.status);
    }

    doc.end();
  } catch (err) {
    console.error("PDF ERROR", err);
    res.status(500).json({ message: "Error generating PDF" });
  }
};

/*============================================
  HEADER COMPANY INFO
==============================================*/
const drawHeader = (doc, header, copyLabel) => {
  //LOGO
  try {
    doc.image(logo, 40, 40, { width: 60 });
  } catch {}

  doc
    .fontSize(16)
    .text(header.business_name || "BUSINESS NAME", 0, 40, { align: "center" });

  doc
    .fontSize(10)
    .text(header.branch_name || "", { align: "center" })
    .text(header.branch_address || "", { align: "center" })
    .text(`Tel: ${header.branch_telephone || "-"}`, { align: "center" });

  doc.moveDown();

  doc
    .fontSize(14)
    .text("GOODS RECEIVED NOTE (GRN)", { align: "center", underline: true });

  doc.fontSize(14).text(copyLabel, { align: "right" });

  doc.moveDown();
};

/*================================================
  QR CODE
==================================================*/
const drawQR = async (doc, header) => {
  const qrData = `GRN:${header.grn_no}`;
  const qrImage = await QRCode.toDataURL(qrData);

  doc.image(qrImage, 470, 120, { width: 70 });
};

/*================================================
  DETAILS
==================================================*/
const drawDetails = (doc, header) => {
  doc.fontSize(10);

  doc.text(`GRN No: ${header.grn_no}`, 40);
  doc.text(`Date: ${formatDate(header.receive_date)}`, 300);

  doc.text(`Supplier: ${header.supplier_name}`, 40);
  doc.text(`Invoice No: ${header.invoice_no}`, 300);

  doc.text(`Supplier Phone: ${header.supplier_phone || "-"}`, 40);
  doc.text(`Status: ${header.status}`, 300);

  doc.moveDown();
};

/*================================================
  TABLE
==================================================*/
const drawTable = (doc, items) => {
  let y = doc.y;

  const headers = ["S/N", "Product", "Qty", "Cost", "Discount", "Tax", "Total"];

  drawRow(doc, y, headers, true);

  y += 20;

  items.forEach((item, i) => {
    drawRow(doc, y, [
      i + 1,
      item.product_name,
      item.quantity,
      money(item.cost_price),
      money(item.discount),
      money(item.tax),
      money(item.line_total),
    ]);

    y += 20;

    if (y > 750) {
      doc.addPage();
      y = 50;
      drawRow(doc, y, headers, true);
      y += 20;
    }
  });

  doc.y = y;
};

const drawRow = (doc, y, row, isHeader = false) => {
  const x = [40, 80, 250, 300, 360, 420, 480];

  if (isHeader) doc.font("Helvetica-Bold");
  else doc.font("Helvetica");

  row.forEach((text, i) => {
    doc.text(String(text), x[i], y, { width: 70 });
  });

  doc
    .moveTo(40, y + 15)
    .lineTo(550, y + 15)
    .stroke();
};

/*================================================
  TOTALS
==================================================*/
const drawTotals = (doc, header) => {
  doc.moveDown();

  const right = 350;

  doc.text(`Subtotal: ${money(header.subtotal)}`, right);

  doc.text(`Other Charges: ${money(header.other_charges)}`, right);

  doc.text(`Grand Total: ${money(header.grand_total)}`, right);

  doc.text(`Amount Paid: ${money(header.amount_paid)}`, right);

  doc.text(`Outstanding: ${money(header.outstanding)}`, right);
};

/*================================================
  SIGNATURES
==================================================*/
const drawSignatures = (doc) => {
  doc.moveDown(3);

  const y = doc.y;

  doc.text("_________________________", 40);
  doc.text("Received By", 40);

  doc.text("_________________________", 220);
  doc.text("Checked By", 220);

  doc.text("_________________________", 400);
  doc.text("Storekeeper", 400);
};
/*================================================
  FOOTER
==================================================*/
const drawFooter = (doc, header) => {
  doc
    .fontSize(8)
    .text(
      `Printed on ${new Date().toLocaleDateString()} | GRN: ${header.grn_no}`,
      40,
      800,
      { align: "center" },
    );
};

/*================================================
  WATERMARK
==================================================*/
const drawWatermark = (doc, status) => {
  if (!status) return;

  doc.save();

  doc.rotate(-45, { origin: [300, 400] });

  doc
    .fontSize(60)
    .fillColor("gray", 0.2)
    .text(status, 100, 300, { align: "center" });

  doc.restore();
};

/*================================================
  HELPERS
==================================================*/
const money = (val) => {
  return (
    "₦" +
    Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })
  );
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString();
};

export const generateGRNPDFBuffer = async (receive_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const chunks = [];

      const doc = new PDFDocument({ margin: 40 });

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      //REUSE EXISTING LOGIC HERE
      //drawHeader, drawTable, etc.

      doc.text(`GRN PDF for ID: ${receive_id}`);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
