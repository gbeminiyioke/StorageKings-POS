import pool from "../config/db.js";

export const recoverAbandonedOnboardings = async () => {
  try {
    await pool.query(
      `
      UPDATE customer_onboarding_queue
      SET
      status='PENDING',
      assigned_to=NULL,
      assigned_session_id=NULL,
      started_by=NULL,
      started_at=NULL,
      last_activity=NULL
      WHERE
      status='IN_PROGRESS'
      AND last_activity <
      NOW() - INTERVAL '30 minutes'
`,
    );
  } catch (err) {
    console.error("Onboarding recovery failed", err);
  }
};
