import pool from "../config/db.js";

/*
GET PURCHASE REPORT
filters:
- startDate
- endDate
- supplier
- branch
- product
*/

export const getPurchasesReport = async (req, res) => {
  try {
    const { startDate, endDate, supplier, branch, product } = req.query;

    let query = `
    SELECT ri.receive_id, ri.grn_no, ri.invoice_no, ri.receive_date, ri.grand_total, ri.created_at, s.supplier_name, b.branch_name, rid.product_id, p.product_name, rid.quantity, rid.cost_price, rid.line_total FROM receive_items ri JOIN suppliers s ON ri.supplier_id = s.id JOIN branches b ON ri.branch_id = b.branch_id JOIN receive_item_details rid ON rid.receive_id = ri.receive_id JOIN products p ON p.product_id = rid.product_id WHERE 1=1`;

    const params = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND ri.receive_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND ri.receive_date <= $${params.length}`;
    }

    if (supplier) {
      params.push(supplier);
      query += ` AND ri.supplier_id = $${params.length}`;
    }

    if (branch) {
      params.push(branch);
      query += ` AND ri.branch_id = $${params.length}`;
    }

    if (product) {
      params.push(product);
      query += ` AND rid.product_id = $${params.length}`;
    }

    query += ` ORDER BY ri.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading purchases report" });
  }
};
