import PDFDocument from "pdfkit";
import pool from "../config/db.js";

export const generateDischargePdf = async (discharge_id) => {
  const headerResult = await pool.query(
    `
    SELECT
      dh.discharge_id,
      dh.discharge_no,
      dh.discharge_date,
      dh.discharge_notes,
      dh.staff_signature,
      dh.customer_signature,
      dh.storage_no,
      dh.reversed,
      dh.approval_status,
      c.fullname,
      c.email,
      c.telephone,
      b.branch_name,
      bus.business_name,
      sp.product_name AS storage_space
    FROM discharge_headers dh
    INNER JOIN customers c ON c.id = dh.customer_id
    INNER JOIN branches b ON b.branch_id = dh.branch_id
    INNER JOIN business bus ON bus.business_id = b.business_id
    LEFT JOIN storage_headers sh ON sh.storage_id = dh.storage_id
    LEFT JOIN products sp ON sp.product_id = sh.storage_space_product_id
    WHERE dh.discharge_id = $1
    `,
    [discharge_id],
  );

  if (!headerResult.rows.length) {
    throw new Error("Discharge record not found");
  }

  const itemsResult = await pool.query(
    `
    SELECT
      dd.discharged_quantity,
      dd.condition_on_discharge,
      p.product_name
    FROM discharge_details dd
    INNER JOIN products p ON p.product_id = dd.product_id
    WHERE dd.discharge_id = $1
    ORDER BY dd.discharge_detail_id
    `,
    [discharge_id],
  );

  const header = headerResult.rows[0];
  const items = itemsResult.rows;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    // ===== WATERMARK (FIXED — NO LAYOUT SHIFT) =====
    // ===== WATERMARK (REVERSED / REJECTED) =====
    const status = header.approval_status;

    if (status === "REVERSED" || status === "REJECTED") {
      const originalY = doc.y;

      doc.save();

      const centerX = doc.page.width / 2;
      const centerY = doc.page.height / 2;

      doc.rotate(-45, { origin: [centerX, centerY] });

      doc
        .font("Helvetica-Bold")
        .fontSize(80)
        .fillColor(status === "REVERSED" ? "red" : "orange")
        .opacity(0.12)
        .text(
          status === "REVERSED" ? "REVERSED" : "REJECTED",
          centerX - 200,
          centerY - 40,
          {
            width: 400,
            align: "center",
            lineBreak: false,
          },
        );

      doc.restore();

      doc.y = originalY;
    }

    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const usableWidth = doc.page.width - 80;

    // ===== HEADER =====
    doc.font("Helvetica-Bold").fontSize(18);
    doc.text((header.business_name || "STORAGE KINGS").toUpperCase(), {
      align: "center",
    });

    doc.moveDown(0.3);

    doc.font("Helvetica-Bold").fontSize(15);
    doc.text("Client Discharge & Item Retrieval Confirmation Form", {
      align: "center",
    });

    doc.moveDown(1);

    // ===== DETAILS =====
    let y = doc.y;

    doc.font("Helvetica").fontSize(11);

    doc.text("Customer Name:", 40, y);
    doc.font("Helvetica-Bold").text(header.fullname || "", 140, y);

    doc.font("Helvetica").text("Date:", 420, y);
    doc
      .font("Helvetica-Bold")
      .text(
        header.discharge_date
          ? new Date(header.discharge_date).toLocaleDateString()
          : "",
        455,
        y,
      );

    y += 22;

    doc.font("Helvetica").text("Discharge No:", 40, y);
    doc.font("Helvetica-Bold").text(header.discharge_no || "", 140, y);

    doc.font("Helvetica").text("Storage No:", 320, y);
    doc.font("Helvetica-Bold").text(header.storage_no || "", 395, y);

    y += 22;

    doc.font("Helvetica").text("Branch:", 40, y);
    doc.font("Helvetica-Bold").text(header.branch_name || "", 140, y);

    doc.font("Helvetica").text("Storage Space:", 320, y);
    doc.font("Helvetica-Bold").text(header.storage_space || "-", 415, y);

    y += 30;

    // ===== INTRO =====
    doc
      .font("Helvetica")
      .text(
        "This is to certify that the customer named above has received the following items from our storage facility:",
        40,
        y,
        { width: usableWidth },
      );

    y += 30;

    // ===== TABLE =====
    const tableLeft = 40;
    const rowHeight = 22;
    const totalRows = Math.max(items.length, 18);

    doc.rect(tableLeft, y, 520, rowHeight * (totalRows + 1)).stroke();

    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("S/N", tableLeft + 10, y + 6);
    doc.text("ITEM DESCRIPTION", tableLeft + 50, y + 6);
    doc.text("QTY", tableLeft + 360, y + 6);
    doc.text("CONDITION", tableLeft + 420, y + 6);

    doc.font("Helvetica").fontSize(10);

    items.forEach((item, index) => {
      const rowY = y + rowHeight * (index + 1) + 6;

      doc.text(String(index + 1), tableLeft + 12, rowY);
      doc.text(item.product_name, tableLeft + 50, rowY, { width: 280 });
      doc.text(String(item.discharged_quantity), tableLeft + 360, rowY);
      doc.text(item.condition_on_discharge, tableLeft + 420, rowY);
    });

    // ===== NOTES =====
    const notesY = y + rowHeight * (totalRows + 1) + 15;

    doc.font("Helvetica-Bold").text("Declaration", 40, notesY);

    doc
      .font("Helvetica")
      .text(
        "I confirm that I have retrieved the listed items in satisfactory condition unless otherwise stated.",
        40,
        notesY + 18,
        { width: usableWidth },
      );

    let nextY = notesY + 60;

    if (header.discharge_notes) {
      doc.font("Helvetica-Bold").text("Notes:", 40, nextY);
      doc.font("Helvetica").text(header.discharge_notes, 80, nextY);
      nextY += 40;
    }

    // ===== PREVENT PAGE BREAK =====
    const requiredHeight = 150;
    if (nextY + requiredHeight > doc.page.height - 50) {
      doc.addPage();
      nextY = 60;
    }

    // ===== SIGNATURE SECTION =====
    const customerSigY = nextY;

    doc.font("Helvetica-Bold").text("Client Name:", 40, customerSigY);
    doc.font("Helvetica").text(header.fullname || "", 120, customerSigY);

    doc.font("Helvetica-Bold").text("Date:", 420, customerSigY);
    doc
      .font("Helvetica")
      .text(
        header.discharge_date
          ? new Date(header.discharge_date).toLocaleDateString()
          : "",
        455,
        customerSigY,
      );

    // line
    doc
      .moveTo(150, customerSigY + 30)
      .lineTo(310, customerSigY + 30)
      .stroke();
    doc.text("Client Signature:", 40, customerSigY + 20);

    // staff
    const staffY = customerSigY + 70;

    doc.font("Helvetica-Bold").text("Authorized Officer:", 40, staffY);
    doc
      .moveTo(160, staffY + 12)
      .lineTo(310, staffY + 12)
      .stroke();

    doc.text("Signature:", 40, staffY + 30);
    doc
      .moveTo(110, staffY + 42)
      .lineTo(310, staffY + 42)
      .stroke();

    doc.text("Date:", 420, staffY + 30);
    doc
      .moveTo(455, staffY + 42)
      .lineTo(540, staffY + 42)
      .stroke();

    // ===== SIGNATURE IMAGES =====
    try {
      if (header.customer_signature) {
        const img = Buffer.from(
          header.customer_signature.split(",")[1],
          "base64",
        );

        doc.image(img, 155, customerSigY + 5, {
          width: 140,
          height: 25,
        });
      }

      if (header.staff_signature) {
        const img = Buffer.from(header.staff_signature.split(",")[1], "base64");

        doc.image(img, 115, staffY + 20, {
          width: 180,
          height: 25,
        });
      }
    } catch (err) {
      console.error("Signature render error", err);
    }

    // ===== FOOTER =====
    doc.font("Helvetica").fontSize(8).fillColor("gray");
    doc.text(
      `Discharge No: ${header.discharge_no}    Storage No: ${header.storage_no}`,
      40,
      doc.page.height - 40,
      { align: "center" },
    );

    doc.end();
  });
};
