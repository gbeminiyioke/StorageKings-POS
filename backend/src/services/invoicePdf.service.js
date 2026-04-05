import PDFDocument from "pdfkit";

export const generateInvoicePdf = async ({ sale, items }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
      });

      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Header
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text(sale.business_name || sale.branch_name || "Business", {
          align: "center",
        });

      doc
        .moveDown(0.3)
        .fontSize(11)
        .font("Helvetica")
        .text(sale.branch_address || "", { align: "center" })
        .text(sale.branch_telephone || "", { align: "center" })
        .text(sale.branch_email || "", { align: "center" });

      doc.moveDown(1);

      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(sale.transaction_type || "INVOICE", {
          align: "center",
        });

      doc.moveDown(1);

      // Sale info
      const invoiceNo = sale.invoice_no || sale.proforma_no || sale.refund_no;

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`Invoice No: ${invoiceNo}`, 40, 170)
        .text(
          `Date: ${new Date(sale.transaction_date).toLocaleDateString()}`,
          350,
          170,
        )
        .text(`Customer: ${sale.fullname || "Walk-in Customer"}`, 40, 190);

      if (sale.telephone) {
        doc.text(`Phone: ${sale.telephone}`, 40, 210);
      }

      if (sale.address_1) {
        doc.text(`Address: ${sale.address_1}`, 40, 230);
      }

      // Table header
      let y = 280;

      doc
        .rect(40, y, 515, 22)
        .fill("#eeeeee")
        .fillColor("black")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("Description", 50, y + 7)
        .text("Qty", 310, y + 7)
        .text("Price", 380, y + 7)
        .text("Total", 470, y + 7);

      y += 30;

      // Items
      doc.font("Helvetica").fontSize(10);

      items.forEach((item) => {
        doc
          .text(item.product_name || "", 50, y, { width: 230 })
          .text(Number(item.quantity).toFixed(2), 310, y)
          .text(Number(item.selling_price).toFixed(2), 380, y)
          .text(Number(item.total).toFixed(2), 470, y);

        y += 22;

        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      });

      y += 20;

      // Totals
      doc
        .font("Helvetica-Bold")
        .text(
          `Subtotal: ₦ ${Number(sale.subtotal || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}`,
          350,
          y,
        )
        .text(
          `VAT: ₦ ${Number(sale.vat || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}`,
          350,
          y + 20,
        )
        .text(
          `Paid: ₦ ${Number(sale.amount_paid || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}`,
          350,
          y + 40,
        )
        .text(
          `Balance Due: ₦ ${Number(sale.balance_due || 0).toLocaleString(
            undefined,
            {
              minimumFractionDigits: 2,
            },
          )}`,
          350,
          y + 60,
        )
        .fontSize(13)
        .text(
          `Grand Total: ₦ ${Number(sale.grand_total || 0).toLocaleString(
            undefined,
            {
              minimumFractionDigits: 2,
            },
          )}`,
          350,
          y + 90,
        );

      doc.moveDown(4);

      doc.fontSize(10).font("Helvetica").text("Thank you for your business!", {
        align: "center",
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
