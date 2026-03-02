import pool from "../config/db.js";

export const getNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id],
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE notification_id = $1`,
      [req.params.id],
    );

    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Error updating notification" });
  }
};
