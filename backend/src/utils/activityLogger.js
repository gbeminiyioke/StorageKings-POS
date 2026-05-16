import pool from "../config/db.js";

export const logActivity = async ({
  userId = null,
  customerId = null,
  userName,
  branchId,
  module,
  action,
  description,
  ipAddress,
}) => {
  try {
    /*
    console.log("LOGGING ACTIVITY =", {
      userId,
      customerId,
      userName,
      branchId,
      module,
      action,
      description,
      ipAddress,
    });
    */

    await pool.query(
      `INSERT INTO activity_logs
      (user_id, customer_id, user_name, branch_id, module, action, description, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        customerId,
        userName || null,
        branchId ? parseInt(branchId) : null,
        module,
        action,
        description || null,
        ipAddress || null,
      ],
    );
  } catch (err) {
    console.error("Activity log error:", err);
  }
};

export default logActivity;
