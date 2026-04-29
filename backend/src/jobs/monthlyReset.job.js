import pool from "../config/db.js";

export const runMonthlyStorageReset = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    /* 🔥 LOG BEFORE RESET */
    await client.query(
      `
      INSERT INTO monthly_customer_storage_visits_log (
        month_number,
        year,
        customer_id,
        storage_id,
        max_visits,
        visits
      )
      SELECT
        $1,
        $2,
        customer_id,
        storage_id,
        max_monthly_visits,
        current_visits
      FROM storage_headers
      ON CONFLICT (month_number, year, storage_id) DO NOTHING
      `,
      [month, year],
    );

    /* 🔥 RESET */
    await client.query(`
      UPDATE storage_headers
      SET
        max_monthly_visits = 3,
        current_visits = 0
    `);

    await client.query("COMMIT");

    console.log("✅ Monthly storage reset done");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
  } finally {
    client.release();
  }
};
