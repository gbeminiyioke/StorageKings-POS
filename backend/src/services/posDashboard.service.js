import pool from "../config/db.js";

export const getPOSDashboardService = async () => {
  const client = await pool.connect();

  try {
    /* =========================================================
       SUMMARY KPI
    ========================================================= */

    const summaryQuery = `
      SELECT
        /* SALES PRODUCTS */
        COALESCE(SUM(
          CASE
            WHEN p.storage = false
            THEN pbb.stock_quantity
            ELSE 0
          END
        ),0) AS sales_products_available,

        /* STORAGE SPACES */
        COALESCE(SUM(
          CASE
            WHEN p.storage = true
            THEN pbb.stock_quantity
            ELSE 0
          END
        ),0) AS storage_spaces_available

      FROM products p
      JOIN products_by_branch pbb
        ON p.product_id = pbb.product_id

      WHERE p.deleted = false
        AND p.can_be_sold = true
    `;

    const summaryRes = await client.query(summaryQuery);

    /* =========================================================
       SALES THIS MONTH
    ========================================================= */

    const salesMonthQuery = `
  SELECT
    COALESCE(SUM(product_qty),0) AS quantity,
    COALESCE(SUM(grand_total),0) AS value

  FROM (
      SELECT
          ps.sale_id,
          ps.grand_total,
          SUM(psd.quantity) AS product_qty

      FROM pos_sales ps

      JOIN pos_sale_details psd
          ON ps.sale_id = psd.sale_id

      JOIN products p
          ON p.product_id = psd.product_id

      WHERE p.deleted = false
        AND p.storage = false
        AND p.can_be_sold = true
        AND ps.transaction_type = 'INVOICE'

        AND DATE_TRUNC('month', ps.transaction_date)
            = DATE_TRUNC('month', CURRENT_DATE)

      GROUP BY
          ps.sale_id,
          ps.grand_total
  ) x
`;

    const salesMonthRes = await client.query(salesMonthQuery);

    /* =========================================================
       SALES THIS YEAR
    ========================================================= */

    const salesYearQuery = `
  SELECT
    COALESCE(SUM(product_qty),0) AS quantity,
    COALESCE(SUM(grand_total),0) AS value

  FROM (
      SELECT
          ps.sale_id,
          ps.grand_total,
          SUM(psd.quantity) AS product_qty
      FROM pos_sales ps
      JOIN pos_sale_details psd
          ON ps.sale_id = psd.sale_id
      JOIN products p
          ON p.product_id = psd.product_id
      WHERE p.deleted = false
        AND p.storage = false
        AND p.can_be_sold = true
        AND ps.transaction_type = 'INVOICE'
        AND DATE_TRUNC('year', ps.transaction_date)
            = DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY
          ps.sale_id,
          ps.grand_total
  ) x
`;

    const salesYearRes = await client.query(salesYearQuery);

    /* =========================================================
       STORAGE THIS MONTH
    ========================================================= */

    const storageMonthQuery = `
      SELECT
        COUNT(DISTINCT psd.product_id) AS storage_types_sold,
        COALESCE(SUM(psd.quantity),0) AS quantity,
        COALESCE(SUM(ps.grand_total),0) AS value

      FROM pos_sale_details psd

      JOIN pos_sales ps
        ON ps.sale_id = psd.sale_id

      JOIN products p
        ON p.product_id = psd.product_id

      WHERE p.deleted = false
        AND p.storage = true
        AND p.can_be_sold = true
        AND ps.transaction_type = 'INVOICE'

        AND DATE_TRUNC('month', ps.transaction_date)
            = DATE_TRUNC('month', CURRENT_DATE)
    `;

    const storageMonthRes = await client.query(storageMonthQuery);

    /* =========================================================
       STORAGE THIS YEAR
    ========================================================= */

    const storageYearQuery = `
      SELECT
        COUNT(DISTINCT psd.product_id) AS storage_types_sold,
        COALESCE(SUM(psd.quantity),0) AS quantity,
        COALESCE(SUM(ps.grand_total),0) AS value

      FROM pos_sale_details psd

      JOIN pos_sales ps
        ON ps.sale_id = psd.sale_id

      JOIN products p
        ON p.product_id = psd.product_id

      WHERE p.deleted = false
        AND p.storage = true
        AND p.can_be_sold = true
        AND ps.transaction_type = 'INVOICE'

        AND DATE_TRUNC('year', ps.transaction_date)
            = DATE_TRUNC('year', CURRENT_DATE)
    `;

    const storageYearRes = await client.query(storageYearQuery);

    /*=========================================================
      TODAYS SALES
    ===========================================================*/
    const salesTodayQuery = `
  SELECT
    COALESCE(SUM(product_qty),0) AS quantity,

    COALESCE(SUM(grand_total),0) AS value

  FROM (
      SELECT
          ps.sale_id,
          ps.grand_total,
          SUM(psd.quantity) AS product_qty

      FROM pos_sales ps

      JOIN pos_sale_details psd
          ON ps.sale_id = psd.sale_id

      JOIN products p
          ON p.product_id = psd.product_id

      WHERE p.deleted = false
        AND p.storage = false
        AND p.can_be_sold = true

        AND ps.transaction_type = 'INVOICE'

        AND ps.transaction_date = CURRENT_DATE

      GROUP BY
          ps.sale_id,
          ps.grand_total
  ) x
`;
    const salesTodayRes = await client.query(salesTodayQuery);

    /*==========================================================
      STORAGE TODAY
    ============================================================*/
    const storageTodayQuery = `
  SELECT
    COUNT(DISTINCT product_id) AS storage_types_sold,

    COALESCE(SUM(quantity),0) AS quantity,

    COALESCE(SUM(grand_total),0) AS value

  FROM (
      SELECT
          ps.sale_id,
          ps.grand_total,
          psd.product_id,
          psd.quantity

      FROM pos_sales ps

      JOIN pos_sale_details psd
          ON ps.sale_id = psd.sale_id

      JOIN products p
          ON p.product_id = psd.product_id

      WHERE p.deleted = false
        AND p.storage = true
        AND p.can_be_sold = true

        AND ps.transaction_type = 'INVOICE'

        AND ps.transaction_date = CURRENT_DATE
  ) x
`;

    const storageTodayRes = await client.query(storageTodayQuery);

    /*==========================================================
      TODAY'S BRANCH REVENUE
    ============================================================*/
    const branchRevenueTodayQuery = `
  SELECT
      b.branch_name,

      COALESCE(SUM(ps.grand_total),0) AS revenue

  FROM branches b

  LEFT JOIN pos_sales ps
      ON ps.branch_id = b.branch_id
      AND ps.transaction_type = 'INVOICE'
      AND ps.transaction_date = CURRENT_DATE

  GROUP BY b.branch_name

  ORDER BY revenue DESC
`;

    const branchRevenueTodayRes = await client.query(branchRevenueTodayQuery);

    /*=========================================================
      MONTH TO DATE BRANCH REVENUE
    ===========================================================*/
    const branchRevenueMonthQuery = `
  SELECT
      b.branch_name,

      COALESCE(SUM(ps.grand_total),0) AS revenue

  FROM branches b

  LEFT JOIN pos_sales ps
      ON ps.branch_id = b.branch_id
      AND ps.transaction_type = 'INVOICE'

      AND DATE_TRUNC('month', ps.transaction_date)
          = DATE_TRUNC('month', CURRENT_DATE)

  GROUP BY b.branch_name

  ORDER BY revenue DESC
`;

    const branchRevenueMonthRes = await client.query(branchRevenueMonthQuery);

    /*==========================================================
      YEAR TO DATE BRANCH REVENUE
    ============================================================*/
    const branchRevenueYearQuery = `
  SELECT
      b.branch_name,

      COALESCE(SUM(ps.grand_total),0) AS revenue

  FROM branches b

  LEFT JOIN pos_sales ps
      ON ps.branch_id = b.branch_id
      AND ps.transaction_type = 'INVOICE'

      AND DATE_TRUNC('year', ps.transaction_date)
          = DATE_TRUNC('year', CURRENT_DATE)

  GROUP BY b.branch_name

  ORDER BY revenue DESC
`;

    const branchRevenueYearRes = await client.query(branchRevenueYearQuery);

    /*==========================================================
      VAT ANALYTICS
    ============================================================*/
    const vatAnalyticsQuery = `
      SELECT COALESCE(SUM(vat),0) AS vat_collected FROM pos_sales WHERE transaction_type = 'INVOICE'
      `;

    const vatAnalyticsRes = await client.query(vatAnalyticsQuery);

    /*==========================================================
      FINANCIALS KPI'S
    ============================================================*/
    const financialKPIQuery = `
  SELECT

      /* NET SALES (before VAT) */
      COALESCE(SUM(subtotal),0) AS net_revenue,

      /* VAT */
      COALESCE(SUM(vat),0) AS vat_collected,

      /* GROSS SALES (after VAT) */
      COALESCE(SUM(grand_total),0) AS gross_revenue,

      /* OUTSTANDING RECEIVABLES */
      COALESCE(SUM(balance_due),0) AS outstanding_receivables,

      /* REFUNDS */
      COALESCE(SUM(
          CASE
              WHEN transaction_type = 'REFUND'
              THEN grand_total
              ELSE 0
          END
      ),0) AS refund_value

  FROM pos_sales
`;

    const financialKPIRes = await client.query(financialKPIQuery);

    /* =========================================================
       BRANCH ANALYTICS
    ========================================================= */

    const branchQuery = `
      SELECT
        b.branch_id,
        b.branch_name,

        COALESCE(SUM(ps.grand_total),0) AS revenue,

        COUNT(DISTINCT ps.sale_id) AS transactions

      FROM branches b

      LEFT JOIN pos_sales ps
        ON ps.branch_id = b.branch_id
        AND ps.transaction_type = 'INVOICE'

      GROUP BY
        b.branch_id,
        b.branch_name

      ORDER BY revenue DESC
    `;

    const branchRes = await client.query(branchQuery);

    /* =========================================================
       PAYMENT METHODS
    ========================================================= */

    const paymentQuery = `
      SELECT
        payment_method,
        COALESCE(SUM(amount),0) AS total

      FROM pos_payments

      GROUP BY payment_method
      ORDER BY total DESC
    `;

    const paymentRes = await client.query(paymentQuery);

    /* =========================================================
       TOP PRODUCTS
    ========================================================= */

    const topProductsQuery = `
      SELECT
        p.product_name,
        SUM(psd.quantity) AS qty_sold,
        SUM(psd.total) AS revenue

      FROM pos_sale_details psd

      JOIN products p
        ON p.product_id = psd.product_id

      JOIN pos_sales ps
        ON ps.sale_id = psd.sale_id

      WHERE ps.transaction_type = 'INVOICE'

      GROUP BY p.product_name

      ORDER BY qty_sold DESC

      LIMIT 10
    `;

    const topProductsRes = await client.query(topProductsQuery);

    /* =========================================================
       LOW STOCK ALERTS
    ========================================================= */

    const alertsQuery = `
      SELECT
        p.product_name,
        b.branch_name,
        p.minimum_quantity,
        pbb.stock_quantity

      FROM products p

      JOIN products_by_branch pbb
        ON p.product_id = pbb.product_id

      JOIN branches b
        ON b.branch_id = pbb.branch_id

      WHERE p.monitor_stock = true
        AND deleted = false AND can_be_sold = true
        AND pbb.stock_quantity <= p.minimum_quantity

      ORDER BY pbb.stock_quantity ASC
    `;

    const alertsRes = await client.query(alertsQuery);

    return {
      summary: summaryRes.rows[0],

      salesToday: salesTodayRes.rows[0],
      salesMonth: salesMonthRes.rows[0],
      salesYear: salesYearRes.rows[0],

      storageToday: storageTodayRes.rows[0],
      storageMonth: storageMonthRes.rows[0],
      storageYear: storageYearRes.rows[0],

      branchRevenueToday: branchRevenueTodayRes.rows,

      branchRevenueMonth: branchRevenueMonthRes.rows,

      branchRevenueYear: branchRevenueYearRes.rows,

      vatAnalytics: vatAnalyticsRes.rows[0],

      financials: financialKPIRes.rows[0],

      paymentMethods: paymentRes.rows,

      topProducts: topProductsRes.rows,

      alerts: alertsRes.rows,
    };
  } finally {
    client.release();
  }
};
