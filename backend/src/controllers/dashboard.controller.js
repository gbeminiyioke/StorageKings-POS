import pool from "../config/db.js";

export const getDashboardCounts = async (req, res) => {
  try {
    const lowStock = await pool.query(
      `SELECT COUNT(*) FROM products WHERE stock_quantity <= minimum_quantity`,
    );

    const pendingReceive = await pool.query(
      `SELECT COUNT(*) FROM receive_items WHERE status = 'pending'`,
    );

    const pendingDischarge = await pool.query(`
      SELECT COUNT(*) FROM discharge_items WHERE status = 'pending'`);

    const stockValuation = await pool.query(
      `SELECT SUM(stock_quantity * cost_price) as total_inventory_value FROM products`,
    );

    res.json({
      low_stock: Number(lowStock.rows[0].count),
      pending_receive: Number(pendingReceive.rows[0].count),
      pending_discharge: Number(pendingDischarge.rows[0].count),
      total_stock_value:
        Number(stockValuation.rows[0].total_inventory_value) || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch dashboard counts" });
  }
};
