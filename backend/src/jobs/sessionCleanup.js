import pool from "../config/db.js";

export const cleanupSessions = async () => {
  try {
    await pool.query(
      `
      DELETE FROM user_sessions
      WHERE
      is_active = false
      AND created_at <
      NOW() - INTERVAL '30 days'
      `,
    );

    console.log("Session cleanup complete");
  } catch (err) {
    console.error(err);
  }
};
