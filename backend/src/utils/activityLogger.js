import pool from "../config/db.js";

export const logActivity = async ({
  userId,
  userName,
  branchId,
  module,
  action,
  description,
  ipAddress,
}) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs
      (user_id, user_name, branch_id, module, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, userName, branchId, module, action, description, ipAddress],
    );
  } catch (err) {
    console.error("Activity log error:", err);
  }
};

export default logActivity;
