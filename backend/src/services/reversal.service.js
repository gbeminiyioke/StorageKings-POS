import pool from "../config/db.js";

export const reverseGRN = async (client, receive_id, user_id) => {
  /*=============================================
    GET GRN DETAILS
  ===============================================*/
  const header = await client.query(
    `SELECT * FROM receive_items WHERE receive_id = $1 FOR UPDATE`,
    [receive_id],
  );

  if (!header.rows.length) throw new Error("GRN not found");

  const data = header.rows[0];

  if (data.status !== "APPROVED") {
    throw new Error("Only approved GRN can be reversed");
  }

  /*=============================================
    REVERSE STOCK
  ===============================================*/
  const items = await client.query(
    `SELECT * FROM receive_item_details WHERE receive_id = $1`,
    [receive_id],
  );

  for (const item of items.rows) {
    const stock = await client.query(
      `SELECT stock_quantity FROM products_by_branch WHERE product_id = $1 AND branch_id = $2 FOR UPDATE`,
      [item.product_id, data.branch_id],
    );

    const current = Number(stock.rows[0]?.stock_quantity || 0);
    const after = current - Number(item.quantity);

    await client.query(
      `UPDATE products_by_branch SET stock_quantity = $1 WHERE product_id = $2 AND branch_id = $3`,
      [after, item.product_id, data.branch_id],
    );

    await client.query(
      `INSERT INTO stock_movements (product_id, branch_id, movement_type, quantity, balance_after, reference_id, reference_table, created_by) VALUES ($1, $2, 'REVERSAL', $3, $4, $5, 'receive_items', $6)`,
      [
        item.product_id,
        data.branch_id,
        -item.quantity,
        after,
        receive_id,
        user_id,
      ],
    );
  }

  /*================================================
    REVERSE SUPPLIER BALANCE
  ==================================================*/
  const supplier = await client.query(
    `SELECT current_balance FROM suppliers WHERE id = $1 FOR UPDATE`,
    [data.suppler_id],
  );

  const currentBal = Number(supplier.rows[0].current_balance || 0);

  const newBal =
    currentBal - Number(data.grand_total) + Number(data.amount_paid);

  await client.query(
    `UPDATE suppliers SET current_balance = $1 WHERE id = $2`,
    [newBal, data.supplier_id],
  );

  await client.query(
    `INSERT INTO supplier_transactions (supplier_id, reference_id, reference_no, transaction_type, debit, credit, balance_after, created_by) VALUES ($1, $2, $3, 'REVERSAL', $4, $5, $6, $7)`,
    [
      data.suppler_id,
      receive_id,
      data.grn_no,
      0,
      data.grand_total,
      newBal,
      user_id,
    ],
  );

  /*==========================================
    SET BACK TO DRAFT
  ============================================*/
  await client.query(
    `UPDATE receive_items SET status = 'PENDING' WHERE receive_id = $1`,
    [receive_id],
  );
};
