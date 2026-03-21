import pool from "../config/db.js";

export const updateStock = async ({
  product_id,
  branch_id,
  quantity,
  reference_id,
  user_id,
}) => {
  const stock = await pool.query(
    `SELECT stock_quantity FROM products_by_branch WHERE product_id = $1 and branch_id = $2 FOR UPDATE`,
    [product_id, branch_id],
  );

  const current = stock.rows[0]?.stock_quantity || 0;
  const after = Number(current) + Number(quantity);

  await pool.query(
    `UPDATE products_by_branch SET stock_quantity = $1 WHERE product_id = $2 AND branch_id = $3`,
    [after, product_id, branch_id],
  );

  await pool.query(
    `INSERT INTO stock_movements (product_id, branch_id, movement_type, quantity, balance_after, reference_id, reference_table, created_by) VALUES ($1, $2, 'RECEIVE', $3, $4, $5, 'receive_items', $6)`,
    [product_id, branch_id, quantity, after, reference_id, user_id],
  );
};
