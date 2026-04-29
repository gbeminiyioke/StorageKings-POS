import PDFDocument from "pdfkit";
import pool from "../config/db.js";

const ROWS_PER_PAGE = 22;

export const generateStoragePdf = async (storage_id) => {
  const headerResult = await pool.query(
    `
    SELECT
      sh.storage_id,
      sh.storage_no,
      sh.received_date,
      sh.status,
      sh.received_notes,
      sh.staff_signature,
      sh.customer_signature,

      c.fullname AS customer_name,
      c.email AS customer_email,
      c.telephone AS customer_phone,
      c.address_1,
      c.address_2,

      b.branch_name,
      b.branch_address,
      b.branch_telephone,

      bus.business_name,

      sp.product_name AS storage_space
    FROM storage_headers sh
    INNER JOIN customers c
      ON c.id = sh.customer_id
    INNER JOIN branches b
      ON b.branch_id = sh.branch_id
    INNER JOIN business bus
      ON bus.business_id = b.business_id
    LEFT JOIN products sp
      ON sp.product_id = sh.storage_space_product_id
    WHERE sh.storage_id = $1
    `,
    [storage_id],
  );

  const itemsResult = await pool.query(
    `
    SELECT
      p.product_name,
      si.condition,
      si.item_notes
    FROM storage_items si
    INNER JOIN products p
      ON p.product_id = si.product_id
    WHERE si.storage_id = $1
    ORDER BY si.storage_item_id
    `,
    [storage_id],
  );

  if (!headerResult.rows.length) {
    throw new Error("Storage record not found");
  }

  const header = headerResult.rows[0];
  const items = itemsResult.rows;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 30,
    });

    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const drawHeader = () => {
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(header.business_name || "", 30, 25, {
          width: 535,
          align: "center",
        });

      doc.fontSize(14).text("STORAGE FORM", 30, 50, {
        width: 535,
        align: "center",
      });

      doc.moveTo(30, 75).lineTo(565, 75).stroke();
    };

    drawHeader();

    let y = 90;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Storage No:", 30, y)
      .font("Helvetica")
      .text(header.storage_no || "", 105, y);

    doc
      .font("Helvetica-Bold")
      .text("Received Date:", 320, y)
      .font("Helvetica")
      .text(
        header.received_date
          ? new Date(header.received_date).toISOString().slice(0, 10)
          : "",
        420,
        y,
      );

    y += 18;

    doc
      .font("Helvetica-Bold")
      .text("Customer:", 30, y)
      .font("Helvetica")
      .text(header.customer_name || "", 105, y, {
        width: 180,
      });

    doc
      .font("Helvetica-Bold")
      .text("Telephone:", 320, y)
      .font("Helvetica")
      .text(header.customer_phone || "", 420, y);

    y += 18;

    doc
      .font("Helvetica-Bold")
      .text("Email:", 30, y)
      .font("Helvetica")
      .text(header.customer_email || "", 105, y, {
        width: 180,
      });

    doc
      .font("Helvetica-Bold")
      .text("Branch:", 320, y)
      .font("Helvetica")
      .text(header.branch_name || "", 420, y);

    y += 18;

    doc
      .font("Helvetica-Bold")
      .text("Storage Space:", 30, y)
      .font("Helvetica")
      .text(header.storage_space || "", 105, y, {
        width: 180,
      });

    doc
      .font("Helvetica-Bold")
      .text("Status:", 320, y)
      .font("Helvetica")
      .text(header.status || "", 420, y);

    y += 28;

    const drawTableHeader = () => {
      doc.rect(30, y, 535, 20).fill("#E2E8F0");

      doc
        .fillColor("#000")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("S/N", 35, y + 6, { width: 30 });

      doc.text("Item Name", 70, y + 6, {
        width: 220,
      });

      doc.text("Condition", 300, y + 6, {
        width: 90,
      });

      doc.text("Notes", 395, y + 6, {
        width: 165,
      });

      y += 20;
    };

    drawTableHeader();

    items.forEach((item, index) => {
      if ((index > 0 && index % ROWS_PER_PAGE === 0) || y > 690) {
        doc.addPage();
        drawHeader();
        y = 90;
        drawTableHeader();
      }

      doc.rect(30, y, 535, 24).stroke("#D1D5DB");

      doc
        .fillColor("#000")
        .font("Helvetica")
        .fontSize(8)
        .text(String(index + 1), 35, y + 7, {
          width: 30,
        });

      doc.text(item.product_name || "", 70, y + 7, {
        width: 220,
      });

      doc.text(item.condition || "", 300, y + 7, {
        width: 90,
      });

      doc.text(item.item_notes || "", 395, y + 7, {
        width: 165,
      });

      y += 24;
    });

    const minimumRows = Math.max(ROWS_PER_PAGE - items.length, 0);

    for (let i = 0; i < minimumRows; i++) {
      if (y > 690) {
        doc.addPage();
        drawHeader();
        y = 90;
        drawTableHeader();
      }

      doc.rect(30, y, 535, 24).stroke("#E5E7EB");

      y += 24;
    }

    y += 20;

    doc.font("Helvetica-Bold").fontSize(10).text("Received Notes:", 30, y);

    y += 14;

    doc.rect(30, y, 535, 50).stroke("#D1D5DB");

    doc
      .font("Helvetica")
      .fontSize(9)
      .text(header.received_notes || "", 35, y + 5, {
        width: 525,
      });

    y += 70;

    if (y > 540) {
      doc.addPage();
      drawHeader();
      y = 120;
    }

    doc.font("Helvetica-Bold").fontSize(10).text("Client", 60, y);

    doc.text("Store", 250, y);

    doc.text("Facility Manager", 430, y);

    y += 15;

    doc
      .moveTo(40, y + 50)
      .lineTo(150, y + 50)
      .stroke();

    doc
      .moveTo(225, y + 50)
      .lineTo(335, y + 50)
      .stroke();

    doc
      .moveTo(405, y + 50)
      .lineTo(535, y + 50)
      .stroke();

    try {
      if (
        header.customer_signature &&
        header.customer_signature.startsWith("data:")
      ) {
        const image = Buffer.from(
          header.customer_signature.split(",")[1],
          "base64",
        );

        doc.image(image, 55, y + 5, {
          fit: [80, 40],
        });
      }
    } catch (err) {
      console.error("Customer signature image error:", err);
    }

    try {
      if (
        header.staff_signature &&
        header.staff_signature.startsWith("data:")
      ) {
        const image = Buffer.from(
          header.staff_signature.split(",")[1],
          "base64",
        );

        doc.image(image, 240, y + 5, {
          fit: [80, 40],
        });
      }
    } catch (err) {
      console.error("Staff signature image error:", err);
    }

    doc.end();
  });
};
