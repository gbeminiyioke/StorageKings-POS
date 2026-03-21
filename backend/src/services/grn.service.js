import pool from "../config/db.js";

export const generateGRN = async (branch_id) => {
  const branch = await pool.query(
    `SELECT branch_prefix, next_grn_no FROM branches WHERE branch_id = $1`,
    [branch_id],
  );

  if (!branch.rows.length) throw new Error("Branch not found");

  const prefix = branch.rows[0].branch_prefix;
  const next = branch.rows[0].next_grn_no;

  const grn = `${prefix}-${String(next).padStart(6, "0")}`;

  await pool.query(
    `Update branches SET next_grn_no = next_grn_no + 1 WHERE branch_id = $1`,
    [branch_id],
  );

  return grn;
};
