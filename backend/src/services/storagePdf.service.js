import PDFDocument from "pdfkit";
import pool from "../config/db.js";

export const generateStoragePdf = async (storage_id) => {
  const headerResult = await pool.query(
    `
    SELECT
      sh.storage_no,
      sh.received_date,
      sh.received_notes,
      sh.staff_signature,
      sh.customer_signature,
      c.fullname,
      c.email,
      c.telephone,
      b.branch_name,
      bus.business_name,
      sp.product_name AS storage_space
    FROM storage_headers sh
    JOIN customers c ON c.id = sh.customer_id
    JOIN branches b ON b.branch_id = sh.branch_id
    JOIN business bus ON bus.business_id = b.business_id
    LEFT JOIN products sp ON sp.product_id = sh.storage_space_product_id
    WHERE sh.storage_id = $1
    `,
    [storage_id],
  );

  const itemsResult = await pool.query(
    `
    SELECT
      si.quantity,
      si.condition,
      p.product_name
    FROM storage_items si
    JOIN products p ON p.product_id = si.product_id
    WHERE si.storage_id = $1
    ORDER BY si.storage_item_id
    `,
    [storage_id],
  );

  const header = headerResult.rows[0];
  const items = itemsResult.rows;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 35,
    });

    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Title
    doc.font("Helvetica-Bold").fontSize(18);
    doc.text((header.business_name || "STORAGE KINGS").toUpperCase(), {
      align: "center",
    });

    doc.moveDown(0.2);

    doc.fontSize(14).text("ITEMS RECEIVED NOTE", {
      align: "center",
    });

    // Top details section
    let y = 95;

    doc.font("Helvetica-Bold").fontSize(11);
    doc.text("Name:", 40, y);
    doc.font("Helvetica");
    doc.text(header.fullname || "", 85, y, { underline: true, width: 220 });

    doc.font("Helvetica-Bold");
    doc.text("Date:", 360, y);
    doc.font("Helvetica");
    doc.text(new Date(header.received_date).toLocaleDateString(), 405, y, {
      underline: true,
      width: 150,
    });

    y += 28;

    doc.font("Helvetica-Bold");
    doc.text("Storage Space:", 40, y);
    doc.font("Helvetica");
    doc.text(header.storage_space || "", 130, y, {
      underline: true,
      width: 180,
    });

    doc.font("Helvetica-Bold");
    doc.text("Branch:", 360, y);
    doc.font("Helvetica");
    doc.text(header.branch_name || "", 415, y, {
      underline: true,
      width: 140,
    });

    y += 35;

    // Table layout
    const tableTop = y;
    const tableLeft = 40;
    const snWidth = 35;
    const descWidth = 330;
    const qtyWidth = 70;
    const condWidth = 110;
    const rowHeight = 22;
    const totalRows = Math.max(items.length, 25);

    // Outer border
    doc
      .rect(
        tableLeft,
        tableTop,
        snWidth + descWidth + qtyWidth + condWidth,
        rowHeight * (totalRows + 1),
      )
      .stroke();

    // Vertical lines
    doc
      .moveTo(tableLeft + snWidth, tableTop)
      .lineTo(tableLeft + snWidth, tableTop + rowHeight * (totalRows + 1))
      .stroke();

    doc
      .moveTo(tableLeft + snWidth + descWidth, tableTop)
      .lineTo(
        tableLeft + snWidth + descWidth,
        tableTop + rowHeight * (totalRows + 1),
      )
      .stroke();

    doc
      .moveTo(tableLeft + snWidth + descWidth + qtyWidth, tableTop)
      .lineTo(
        tableLeft + snWidth + descWidth + qtyWidth,
        tableTop + rowHeight * (totalRows + 1),
      )
      .stroke();

    // Header line
    doc
      .moveTo(tableLeft, tableTop + rowHeight)
      .lineTo(
        tableLeft + snWidth + descWidth + qtyWidth + condWidth,
        tableTop + rowHeight,
      )
      .stroke();

    // Horizontal lines
    for (let i = 2; i <= totalRows + 1; i++) {
      const rowY = tableTop + i * rowHeight;
      doc
        .moveTo(tableLeft, rowY)
        .lineTo(tableLeft + snWidth + descWidth + qtyWidth + condWidth, rowY)
        .stroke();
    }

    // Table headings
    doc.font("Helvetica-Bold").fontSize(11);
    doc.text("S/N", tableLeft + 8, tableTop + 6);
    doc.text("ITEMS DESCRIPTION", tableLeft + snWidth + 80, tableTop + 6);
    doc.text("QTY", tableLeft + snWidth + descWidth + 18, tableTop + 6);
    doc.text(
      "CONDITION",
      tableLeft + snWidth + descWidth + qtyWidth + 10,
      tableTop + 6,
    );

    // Item rows
    doc.font("Helvetica").fontSize(10);

    items.forEach((item, index) => {
      const rowY = tableTop + rowHeight * (index + 1) + 6;

      doc.text(String(index + 1), tableLeft + 10, rowY);
      doc.text(item.product_name || "", tableLeft + snWidth + 5, rowY, {
        width: descWidth - 10,
      });
      doc.text(
        String(item.quantity),
        tableLeft + snWidth + descWidth + 20,
        rowY,
      );
      doc.text(
        item.condition || "",
        tableLeft + snWidth + descWidth + qtyWidth + 5,
        rowY,
        { width: condWidth - 10 },
      );
    });

    // Bottom signature area
    const bottomY = Math.min(tableTop + rowHeight * (totalRows + 1) + 10, 670);

    doc.font("Helvetica-Bold").fontSize(11);
    doc.text("Client", 160, bottomY + 90, { align: "center", width: 100 });
    doc.text("Store", 300, bottomY + 90, { align: "center", width: 100 });
    doc.text("Facility Manager", 420, bottomY + 90, {
      align: "center",
      width: 120,
    });

    // signature lines
    doc
      .moveTo(135, bottomY + 80)
      .lineTo(255, bottomY + 80)
      .stroke();
    doc
      .moveTo(290, bottomY + 80)
      .lineTo(390, bottomY + 80)
      .stroke();
    doc
      .moveTo(410, bottomY + 80)
      .lineTo(540, bottomY + 80)
      .stroke();

    // optional uploaded signatures
    try {
      if (header.customer_signature) {
        const img = Buffer.from(
          header.customer_signature.split(",")[1],
          "base64",
        );
        doc.image(img, 145, bottomY + 5, {
          fit: [100, 40],
        });
      }

      if (header.staff_signature) {
        const img = Buffer.from(header.staff_signature.split(",")[1], "base64");
        doc.image(img, 430, bottomY + 5, {
          fit: [100, 40],
        });
      }
    } catch (err) {
      console.error("Signature image error", err);
    }

    // footer small text
    doc.fontSize(8).fillColor("gray");
    doc.text(`Storage No: ${header.storage_no}`, 40, 790);

    doc.end();
  });
};
