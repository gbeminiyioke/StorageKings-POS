import pool from "../config/db.js";

export const updateStock = async (
  client,
  { product_id, branch_id, quantity, reference_id, user_id },
) => {
  try {
    //console.log("STOCK LOCKING:", product_id);

    const stock = await client.query(
      `SELECT stock_quantity FROM products_by_branch WHERE product_id = $1 and branch_id = $2 FOR UPDATE`,
      [product_id, branch_id],
    );

    const current = stock.rows[0]?.stock_quantity || 0;
    const after = Number(current) + Number(quantity);

    //console.log("STOCK BEFORE:", current, "AFTER:", after);
    await client.query(
      `UPDATE products_by_branch SET stock_quantity = $1 WHERE product_id = $2 AND branch_id = $3`,
      [after, product_id, branch_id],
    );

    await client.query(
      `INSERT INTO stock_movements (product_id, branch_id, movement_type, quantity, balance_after, reference_id, reference_table, created_by) VALUES ($1, $2, 'RECEIVE', $3, $4, $5, 'receive_items', $6)`,
      [product_id, branch_id, quantity, after, reference_id, user_id],
    );

    //console.log("STOCK MOVEMENT INSERTED");
  } catch (err) {
    console.error("STOCK ERROR:", err);
    throw err;
  }
};

/* =====================================================
   GET PRODUCTS FOR POS (BRANCH SPECIFIC)
===================================================== */
export const getPOSProductsService = async (branch_id) => {
  const result = await pool.query(
    `
    SELECT
      p.product_id,
      p.product_name,
      p.product_code,
      p.pos_name,
      p.unit,
      p.monitor_stock,
      p.can_be_sold,
      p.deleted,
      p.category_id,
      c.category_name,
      p.cost_price,
      COALESCE(pbb.selling_price, p.selling_price) AS selling_price,
      COALESCE(pbb.stock_quantity, 0) AS stock_quantity
    FROM products p
    JOIN products_by_branch pbb
      ON pbb.product_id = p.product_id
    LEFT JOIN categories c
      ON c.category_id = p.category_id
    WHERE p.deleted = false
      AND p.can_be_sold = true
      AND pbb.branch_id = $1
    ORDER BY p.product_name ASC
  `,
    [branch_id],
  );

  return result.rows;
};
