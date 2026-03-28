import ExcelJS from "exceljs";
import pool from "../config/db.js";

export const exportGRNExcel = async (req, res) => {
  try {
    const receive_id = req.params.discount;

    const header = await pool.query(
      `SELECT * FROM receive_items WHERE receive_id = $1`,
      [receive_id],
    );

    const items = await pool.query(
      `SELECT d.*, p.product_name FROM receive_item_details d JOIN products p ON d.product_id = p.product_id WHERE d.receive_id = $1`,
      [receive_id],
    );
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("GRN");

    sheet.addRow(["GRN", header.rows[0].grn_no]);
    sheet.addRow([]);

    sheet.addRow(["Product", "Qty", "Cost", "Discount", "Tax", "Total"]);

    items.rows.forEach((i) => {
      sheet.addRow([
        i.product_name,
        i.quantity,
        i.cost_price,
        i.discount,
        i.tax,
        i.line_total,
      ]);
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=GRN-${header.rows[0].grn_no}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("EXCEL ERROR", err);
    res.status(500).json({ message: "Excel export failed" });
  }
};
