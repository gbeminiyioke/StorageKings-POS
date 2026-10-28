// backend/src/services/onboardingResponse.service.js

export const buildOnboardingResponse = async (client, onboardingId) => {
  const onboardingData = await client.query(
    `
    SELECT
      q.onboarding_id,
      q.quantity AS duration,
      q.status,
      q.started_at,
      q.assigned_to,
      q.last_activity,

      s.sale_id,
      s.invoice_no,
      s.transaction_date,

      c.id AS customer_id,
      c.fullname,
      c.telephone,
      c.email,

      b.branch_id,
      b.branch_name,

      p.product_id,
      p.product_name

    FROM customer_onboarding_queue q

    JOIN pos_sales s
      ON s.sale_id = q.sale_id

    JOIN customers c
      ON c.id = q.customer_id

    JOIN branches b
      ON b.branch_id = q.branch_id

    JOIN products p
      ON p.product_id = q.product_id

    WHERE q.onboarding_id = $1
    `,
    [onboardingId],
  );

  if (!onboardingData.rows.length) {
    throw new Error("Unable to load onboarding details.");
  }

  const row = onboardingData.rows[0];

  return {
    queue: {
      onboarding_id: row.onboarding_id,
      duration: row.duration,
      status: row.status,
      started_at: row.started_at,
      assigned_to: row.assigned_to,
      last_activity: row.last_activity,
    },

    customer: {
      id: row.customer_id,
      fullname: row.fullname,
      telephone: row.telephone,
      email: row.email,
    },

    branch: {
      branch_id: row.branch_id,
      branch_name: row.branch_name,
    },

    product: {
      product_id: row.product_id,
      product_name: row.product_name,
      duration: row.duration,
    },

    sale: {
      sale_id: row.sale_id,
      invoice_no: row.invoice_no,
      transaction_date: row.transaction_date,
    },
  };
};
