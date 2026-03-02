import pool from "../config/db.js";

export const logAuthEvent = async (
  userId,
  loginType,
  email,
  action,
  req,
  branchId = null,
) => {
  try {
    await pool.query(
      `INSERT INTO auth_logs (user_id, login_type, email, action, ip_address, user_agent, branch_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        loginType,
        email,
        action,
        req.ip,
        req.headers["user-agent"],
        branchId,
      ],
    );
  } catch (err) {
    console.error("Auth log error", err);
  }
};
