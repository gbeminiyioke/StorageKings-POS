import pool from "../config/db.js";

//Backend-verified inactivity timeout (30 minutes).

const INACTIVITY_LIMIT_MINUTES = 30;

export const sessionTimeout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Unauthorized." });

    const session = await pool.query(
      `
      SELECT * FROM user_sessions WHERE token = $1 AND is_active = true
      `,
      [token],
    );

    if (!session.rows.length) {
      return res.status(401).json({ message: "Session expired." });
    }

    const createdAt = new Date(session.rows[0].created_at);
    const now = new Date();

    const diffMinutes = (now - createdAt) / 60000;

    if (diffMinutes > INACTIVITY_LIMIT_MINUTES) {
      await pool.query(
        `
        UPDATE user_sessions SET is_active = false WHERE id = $1
        `,
        [session.rows[0].id],
      );

      return res.status(401).json({ message: "Session timed out." });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Session validation error." });
  }
};
