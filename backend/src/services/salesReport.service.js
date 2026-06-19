import pool from "../config/db.js";

export const getSalesReportService = async (filters) => {
  let params = [];
  let where = [];

  if (filters.from) {
    params.push(filters.from);

    where.push(`ps.created_at >= $${params.length}`);
  }

  if (filters.to) {
    params.push(filters.to);

    where.push(`ps.created_at <= $${params.length}`);
  }

  if (filters.branch_id) {
    params.push(filters.branch_id);

    where.push(`ps.branch_id = $${params.length}`);
  }

  if (filters.transaction_type) {
    params.push(filters.transaction_type);

    where.push(`ps.transaction_type = $${params.length}`);
  }

  const sql = `
      SELECT
        ps.sale_id,

        COALESCE(
          ps.invoice_no,
          ps.proforma_no,
          ps.refund_no
        ) AS reference_no,

        ps.transaction_type,

        ps.grand_total,

        ps.created_at,

        c.fullname
          AS customer_name,

        u.fullname
          AS cashier_name,

        b.branch_name

      FROM pos_sales ps

      LEFT JOIN customers c
      ON c.id = ps.customer_id

      LEFT JOIN users u
      ON u.id = ps.created_by

      LEFT JOIN branches b
      ON b.branch_id =
         ps.branch_id

      ${where.length ? "WHERE " + where.join(" AND ") : ""}

      ORDER BY
        ps.created_at DESC
    `;

  const result = await pool.query(sql, params);

  return result.rows;
};
