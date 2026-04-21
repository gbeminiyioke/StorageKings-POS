import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateSupplierPdf = (supplier) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Supplier Information", 14, 18);

  if (supplier.image_url) {
    try {
      doc.addImage(supplier.image_url, "JPEG", 145, 15, 50, 50);
    } catch (err) {
      console.error("Failed to load supplier image", err);
    }
  }

  const rows = [
    ["Supplier Name", supplier.supplier_name || ""],
    ["Supplier Type", supplier.supplier_type || ""],
    ["Sex", supplier.sex || ""],
    ["Telephone", supplier.telephone || ""],
    ["Address 1", supplier.address_1 || ""],
    ["Address 2", supplier.address_2 || ""],
    ["Address 3", supplier.address_3 || ""],
    ["Fax", supplier.fax || ""],
    ["Email", supplier.email || ""],
    ["Website", supplier.website || ""],
    ["Contact Name", supplier.contact_name || ""],
    ["Contact Telephone", supplier.contact_telephone || ""],
    ["Current Balance", Number(supplier.current_balance || 0).toLocaleString()],
    ["Payment Terms", supplier.payment_terms || ""],
    ["Whatsapp", supplier.whatsapp || ""],
    ["Instagram", supplier.ig || ""],
    ["Facebook", supplier.facebook || ""],
    ["Next Of Kin", supplier.next_of_kin || ""],
    ["Next Of Kin Telephone", supplier.next_of_kin_telephone || ""],
    ["Enabled", supplier.enable ? "Yes" : "No"],
  ];

  autoTable(doc, {
    startY: 75,
    head: [["Field", "Value"]],
    body: rows,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 120 },
    },
  });

  window.open(doc.output("bloburl"), "_blank");
};
