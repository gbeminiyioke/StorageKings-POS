import pool from "../config/db.js";

export const recordSupplierTransaction = async (
  client,
  {
    supplier_id,
    reference_id,
    reference_no,
    grand_total,
    amount_paid,
    user_id,
  },
) => {
  const bal = await client.query(
    `SELECT current_balance FROM suppliers WHERE id = $1 FOR UPDATE`,
    [Number(supplier_id)],
  );

  const current = Number(bal.rows[0].current_balance || 0);
  const newBalance = current + Number(grand_total) - Number(amount_paid);

  await client.query(
    `UPDATE suppliers SET current_balance = $1 WHERE id = $2`,
    [newBalance, Number(supplier_id)],
  );

  await client.query(
    `INSERT INTO supplier_transactions (supplier_id, reference_id, reference_no, transaction_type, debit, credit, balance_after, created_by) VALUES ($1, $2, $3, 'PURCHASE', $4, $5, $6, $7)`,
    [
      Number(supplier_id),
      Number(reference_id),
      reference_no,
      Number(grand_total),
      Number(amount_paid),
      Number(newBalance),
      user_id,
    ],
  );
};
