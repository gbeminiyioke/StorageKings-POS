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
      c.fullname,
      c.email,
      c.telephone,
      b.branch_name,
      bus.business_name,
      sp.product_name AS storage_space
    FROM discharge_headers dh
    INNER JOIN customers c
      ON c.id = dh.customer_id
    INNER JOIN branches b
      ON b.branch_id = dh.branch_id
    INNER JOIN business bus
      ON bus.business_id = b.business_id
    LEFT JOIN storage_headers sh
      ON sh.storage_id = dh.storage_id
    LEFT JOIN products sp
      ON sp.product_id = sh.storage_space_product_id
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
    INNER JOIN products p
      ON p.product_id = dd.product_id
    WHERE dd.discharge_id = $1
    ORDER BY dd.discharge_detail_id
    `,
    [discharge_id],
  );

  const header = headerResult.rows[0];
  const items = itemsResult.rows;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const usableWidth = pageWidth - 80;

    // ===== BUSINESS TITLE =====
    doc.font("Helvetica-Bold").fontSize(18);
    doc.text((header.business_name || "STORAGE KINGS").toUpperCase(), 40, 35, {
      width: usableWidth,
      align: "center",
    });

    doc.moveDown(0.3);

    doc.font("Helvetica-Bold").fontSize(15);
    doc.text("Client Discharge & Item Retrieval Confirmation Form", {
      align: "center",
    });

    doc.moveDown(1);

    // ===== TOP DETAILS =====
    let y = 95;

    doc.font("Helvetica").fontSize(11);

    doc.text("Customer Name:", 40, y);
    doc.font("Helvetica-Bold");
    doc.text(header.fullname || "", 135, y);

    doc.font("Helvetica");
    doc.text("Date:", 420, y);
    doc.font("Helvetica-Bold");
    doc.text(
      header.discharge_date
        ? new Date(header.discharge_date).toLocaleDateString()
        : "",
      455,
      y,
    );

    y += 22;

    doc.font("Helvetica");
    doc.text("Discharge No:", 40, y);
    doc.font("Helvetica-Bold");
    doc.text(header.discharge_no || "", 135, y);

    doc.font("Helvetica");
    doc.text("Storage No:", 320, y);
    doc.font("Helvetica-Bold");
    doc.text(header.storage_no || "", 395, y);

    y += 22;

    doc.font("Helvetica");
    doc.text("Branch:", 40, y);
    doc.font("Helvetica-Bold");
    doc.text(header.branch_name || "", 135, y);

    doc.font("Helvetica");
    doc.text("Storage Space:", 320, y);
    doc.font("Helvetica-Bold");
    doc.text(header.storage_space || "-", 415, y, {
      width: 140,
    });

    y += 30;

    // ===== INTRO TEXT =====
    doc.font("Helvetica").fontSize(11);
    doc.text(
      "This is to certify that the customer named above has received the following items from our storage facility:",
      40,
      y,
      {
        width: usableWidth,
      },
    );

    y += 28;

    // ===== TABLE =====
    const tableLeft = 40;
    const snWidth = 40;
    const itemWidth = 285;
    const qtyWidth = 70;
    const condWidth = 125;
    const rowHeight = 22;
    const totalRows = Math.max(items.length, 18);

    // Outer Border
    doc
      .rect(
        tableLeft,
        y,
        snWidth + itemWidth + qtyWidth + condWidth,
        rowHeight * (totalRows + 1),
      )
      .stroke();

    // Vertical Lines
    doc
      .moveTo(tableLeft + snWidth, y)
      .lineTo(tableLeft + snWidth, y + rowHeight * (totalRows + 1))
      .stroke();

    doc
      .moveTo(tableLeft + snWidth + itemWidth, y)
      .lineTo(tableLeft + snWidth + itemWidth, y + rowHeight * (totalRows + 1))
      .stroke();

    doc
      .moveTo(tableLeft + snWidth + itemWidth + qtyWidth, y)
      .lineTo(
        tableLeft + snWidth + itemWidth + qtyWidth,
        y + rowHeight * (totalRows + 1),
      )
      .stroke();

    // Header Separator
    doc
      .moveTo(tableLeft, y + rowHeight)
      .lineTo(
        tableLeft + snWidth + itemWidth + qtyWidth + condWidth,
        y + rowHeight,
      )
      .stroke();

    // Row Lines
    for (let i = 2; i <= totalRows + 1; i++) {
      const lineY = y + rowHeight * i;
      doc
        .moveTo(tableLeft, lineY)
        .lineTo(tableLeft + snWidth + itemWidth + qtyWidth + condWidth, lineY)
        .stroke();
    }

    // Table Header
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("S/N", tableLeft + 10, y + 6);
    doc.text("ITEM DESCRIPTION", tableLeft + snWidth + 8, y + 6);
    doc.text("QTY", tableLeft + snWidth + itemWidth + 18, y + 6);
    doc.text(
      "CONDITION",
      tableLeft + snWidth + itemWidth + qtyWidth + 12,
      y + 6,
    );

    // Table Rows
    doc.font("Helvetica").fontSize(10);

    items.forEach((item, index) => {
      const rowY = y + rowHeight * (index + 1) + 6;

      doc.text(String(index + 1), tableLeft + 12, rowY);

      doc.text(item.product_name || "", tableLeft + snWidth + 5, rowY, {
        width: itemWidth - 10,
      });

      doc.text(
        String(item.discharged_quantity || 0),
        tableLeft + snWidth + itemWidth + 18,
        rowY,
      );

      doc.text(
        item.condition_on_discharge || "",
        tableLeft + snWidth + itemWidth + qtyWidth + 6,
        rowY,
        {
          width: condWidth - 10,
        },
      );
    });

    // ===== NOTES =====
    const notesY = y + rowHeight * (totalRows + 1) + 15;

    doc.font("Helvetica-Bold").fontSize(11);
    doc.text("Declaration", 40, notesY);

    doc.font("Helvetica").fontSize(10);
    doc.text(
      "I, the undersigned, confirm that I have retrieved the above listed items in satisfactory condition unless otherwise stated above.",
      40,
      notesY + 20,
      {
        width: usableWidth,
      },
    );

    if (header.discharge_notes) {
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("Notes:", 40, notesY + 55);

      doc.font("Helvetica").fontSize(10);
      doc.text(header.discharge_notes, 80, notesY + 55, {
        width: 470,
      });
    }

    // ===== SIGNATURE SECTION =====
    const sigY = notesY + 95;

    // Customer
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Client Name:", 40, sigY);
    doc.font("Helvetica");
    doc.text(header.fullname || "", 120, sigY);

    doc.font("Helvetica-Bold");
    doc.text("Date:", 420, sigY);
    doc.font("Helvetica");
    doc.text(
      header.discharge_date
        ? new Date(header.discharge_date).toLocaleDateString()
        : "",
      455,
      sigY,
    );

    doc.font("Helvetica-Bold");
    doc.text("Client Signature:", 40, sigY + 35);

    doc
      .moveTo(150, sigY + 48)
      .lineTo(310, sigY + 48)
      .stroke();

    // Staff
    doc.font("Helvetica-Bold");
    doc.text("Authorized Officer:", 40, sigY + 90);

    doc
      .moveTo(160, sigY + 103)
      .lineTo(310, sigY + 103)
      .stroke();

    doc.font("Helvetica-Bold");
    doc.text("Signature:", 40, sigY + 125);

    doc
      .moveTo(110, sigY + 138)
      .lineTo(310, sigY + 138)
      .stroke();

    doc.font("Helvetica-Bold");
    doc.text("Date:", 420, sigY + 125);

    doc
      .moveTo(455, sigY + 138)
      .lineTo(540, sigY + 138)
      .stroke();

    // Signature Images
    try {
      if (header.customer_signature) {
        const customerImage = Buffer.from(
          header.customer_signature.split(",")[1],
          "base64",
        );

        doc.image(customerImage, 155, sigY + 12, {
          fit: [140, 30],
        });
      }

      if (header.staff_signature) {
        const staffImage = Buffer.from(
          header.staff_signature.split(",")[1],
          "base64",
        );

        doc.image(staffImage, 115, sigY + 103, {
          fit: [180, 30],
        });
      }
    } catch (err) {
      console.error("Failed to render signature image", err);
    }

    // Footer
    doc.font("Helvetica").fontSize(8).fillColor("gray");
    doc.text(
      `Discharge No: ${header.discharge_no}    Storage No: ${header.storage_no}`,
      40,
      790,
      {
        width: usableWidth,
        align: "center",
      },
    );

    doc.end();
  });
};
