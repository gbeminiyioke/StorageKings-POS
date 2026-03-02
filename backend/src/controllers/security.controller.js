import pool from "../config/db.js";

/*==========================================
  GET AUTH LOGS (ADMIN)
============================================*/
export const getAuthLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    const logs = await pool.query(
      `
      SELECT * FROM auth_logs ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    res.json(logs.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch logs." });
  }
};

/*==========================================
  GET ACTIVE SESSIONS (ADMIN)
============================================*/
export const getActiveSessions = async (req, res) => {
  try {
    const sessions = await pool.query(
      `
      SELECT * FROM user_sessions WHERE is_active = true ORDER BY created_by DESC
      `,
    );

    res.json(sessions.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch sessions." });
  }
};

/*==========================================
  KILL SESSIONS (ADMIN)
============================================*/
export const killSession = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      UPDATE user_sessions SET is_active = false WHERE id = $1
      `,
      [id],
    );

    res.json({ message: "Session terminated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to terminate session." });
  }
};

/*==========================================
  SECURITY DASHBOARD STATS
============================================*/
export const getSecurityStats = async (req, res) => {
  try {
    const activeSessions = await pool.query(
      `SELECT COUNT(*) FROM user_sessions WHERE is_active = true`,
    );

    const failedToday = await pool.query(
      `
      SELECT COUNT(*) FROM auth_logs WHERE action = 'LOGIN_FAILED' AND DATE(created_at) = CURRENT_DATE
      `,
    );

    const lockedAccounts = await pool.query(
      `
      SELECT COUNT(*) FROM users WHERE lock_until IS NOT NULL AND lock_until > NOW()
      `,
    );

    res.json({
      activeSessions: parseInt(activeSessions.rows[0].count),
      failedLoginsToday: parseInt(failedToday.rows[0].count),
      lockedAccounts: parseInt(lockedAccounts.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch security stats." });
  }
};
