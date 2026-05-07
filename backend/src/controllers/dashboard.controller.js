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
      SELECT COUNT(*) FROM storage_headers where deleted=false`);

    const stockValuation = await pool.query(
      `SELECT SUM(COALESCE(p.cost_price, 0) * COALESCE(pbb.stock_quantity, 0)) AS total_inventory_value from products p JOIN products_by_branch pbb ON p.product_id = pbb.product_id where p.deleted=false and p.can_be_sold=true and p.storage=false`,
    );

    const todaySales =
      await pool.query(`select sum(grand_total) as total_sales from pos_sales 
        where transaction_date::date = CURRENT_DATE and transaction_type='INVOICE'`);

    const activeBranches = await pool.query(
      `select count(*) from branches where enable=true`,
    );

    res.json({
      low_stock: Number(lowStock.rows[0].count),
      pending_receive: Number(pendingReceive.rows[0].count),
      pending_discharge: Number(pendingDischarge.rows[0].count),
      total_stock_value:
        Number(stockValuation.rows[0].total_inventory_value) || 0,
      todays_sales: Number(todaySales.rows[0].total_sales) || 0,
      active_branches: Number(activeBranches.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch dashboard counts" });
  }
};
