import pool from "../config/db.js";

export const getPurchaseReport = async (receive_id) => {
  const header = await pool.query(
    `SELECT r.*, s.supplier_name, b.branch_name FROM receive_items r JOIN suppliers s ON r.supplier_id = s.id JOIN branches b ON r.branch_id = b.branch_id WHERE r.receive_id = $1`,
    [receive_id],
  );

  const items = await pool.query(
    `SELECT d.*, p.product_name FROM receive_item_details d JOIN products p ON d.product_id = p.product_id WHERE receive_id = $1`,
    [receive_id],
  );

  return {
    header: header.rows[0],
    items: items.rows,
  };
};
