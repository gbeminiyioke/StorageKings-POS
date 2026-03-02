import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../config/db.js";
import { signToken } from "../config/jwt.js";
import { sendResetEmail } from "../utils/mailer.js";
import { logActivity } from "../utils/activityLogger.js";

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

/*==========================================
  HELPER: Log Auth / Activity Events
============================================*/
const logAuthEvent = async ({
  userId,
  userName,
  branchId,
  loginType,
  email,
  action,
  req,
}) => {
  try {
    await logActivity({
      userId,
      userName,
      branchId: branchId || null,
      module: "AUTH",
      action,
      description: email || userName,
      ipAddress: req.ip,
    });
  } catch (err) {
    console.error("Auth logging failed:", err);
  }
};

/*==========================================
  REQUEST PASSWORD RESET
============================================*/
export const requestPasswordReset = async (req, res) => {
  const { email, loginType } = req.body;
  if (!email || !loginType)
    return res.status(400).json({ message: "Email and login type required." });

  const table = loginType === "staff" ? "users" : "customers";
  const normalizedEmail = email.toLowerCase();

  try {
    const userResult = await pool.query(
      `SELECT id, fullname FROM ${table} WHERE email=$1`,
      [normalizedEmail],
    );

    if (!userResult.rows.length) {
      return res.json({
        message: "If the email exists, a reset link has been sent.",
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expiry = new Date(Date.now() + 30 * 60 * 1000);

    await pool.query(
      `UPDATE ${table} SET reset_token=$1, reset_token_expiry=$2 WHERE email=$3`,
      [token, expiry, normalizedEmail],
    );

    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}&type=${loginType}`;
    await sendResetEmail(email, link);

    await logAuthEvent({
      userId: userResult.rows[0].id,
      userName: userResult.rows[0].fullname,
      loginType,
      email,
      action: "PASSWORD_RESET_REQUEST",
      req,
    });

    res.json({ message: "If the email exists, a reset link has been sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

/*==========================================
  RESET PASSWORD + AUTO LOGIN
============================================*/
export const resetPassword = async (req, res) => {
  const { token, password, type } = req.body;
  if (!token || !password || !type)
    return res.status(400).json({ message: "Invalid request." });

  const table = type === "staff" ? "users" : "customers";

  try {
    const result = await pool.query(
      `SELECT id, fullname FROM ${table} WHERE reset_token=$1 AND reset_token_expiry>NOW()`,
      [token],
    );

    if (!result.rows.length)
      return res.status(400).json({ message: "Invalid or expired token." });

    const userId = result.rows[0].id;
    const userName = result.rows[0].fullname;
    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE ${table} 
       SET password=$1, reset_token=NULL, reset_token_expiry=NULL,
       password_changed_at=NOW(), failed_attempts=0, lock_until=NULL
       WHERE id=$2`,
      [hashed, userId],
    );

    // Invalidate all previous sessions
    await pool.query(
      `UPDATE user_sessions SET is_active=false WHERE user_id=$1 AND login_type=$2`,
      [userId, type],
    );

    // Generate JWT
    const tokenJwt = signToken({
      id: userId,
      fullname: userName,
      roleid: null,
      loginType: type,
      passwordChangedAt: new Date(),
    });

    await pool.query(
      `INSERT INTO user_sessions (user_id, login_type, token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '1 day')`,
      [userId, type, tokenJwt, req.ip, req.headers["user-agent"]],
    );

    await logAuthEvent({
      userId,
      userName,
      loginType: type,
      email: null,
      action: "PASSWORD_RESET_SUCCESS",
      req,
    });

    res.json({
      message: "Password updated successfully.",
      token: tokenJwt,
      loginType: type,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

/*==========================================
  LOGIN (STAFF & CUSTOMER)
============================================*/
export const login = async (req, res) => {
  const { email, password, loginType, branchId } = req.body;
  if (!email || !password || !loginType)
    return res.status(400).json({ message: "Missing login details." });

  const normalizedEmail = email.toLowerCase();
  const table = loginType === "staff" ? "users" : "customers";

  try {
    let user,
      roleId = null,
      roleName = null,
      defaultPage = null,
      permissions = {};

    /* ================= STAFF LOGIN ================= */
    if (loginType === "staff") {
      if (!branchId)
        return res.status(400).json({ message: "Branch required." });

      const userRes = await pool.query(
        `SELECT * FROM users WHERE email=$1 AND enable=true`,
        [normalizedEmail],
      );

      if (!userRes.rows.length) {
        return res.status(401).json({ message: "Invalid login details." });
      }

      user = userRes.rows[0];

      // Check account lock
      if (user.lock_until && new Date(user.lock_until) > new Date()) {
        const remaining = Math.ceil(
          (new Date(user.lock_until) - new Date()) / 60000,
        );
        return res
          .status(403)
          .json({ message: `Account locked. Try in ${remaining} min.` });
      }

      // Verify role for branch
      const roleRes = await pool.query(
        `SELECT r.role_id, r.role_name, r.default_page
         FROM user_branch_roles ubr
         JOIN roles r ON ubr.role_id=r.role_id
         WHERE ubr.user_id=$1 AND ubr.branch_id=$2`,
        [user.id, branchId],
      );

      if (!roleRes.rows.length)
        return res
          .status(403)
          .json({ message: "No role assigned for selected branch." });

      roleId = roleRes.rows[0].role_id;
      roleName = roleRes.rows[0].role_name;
      defaultPage = roleRes.rows[0].default_page;

      // Fetch permissions
      const permRes = await pool.query(
        `SELECT * FROM role_permissions WHERE role_id=$1`,
        [roleId],
      );
      permissions = permRes.rows[0] || {};
    }

    /* ================= CUSTOMER LOGIN ================= */
    if (loginType === "customer") {
      const custRes = await pool.query(
        `SELECT * FROM customers WHERE email=$1 AND enable=true`,
        [normalizedEmail],
      );

      if (!custRes.rows.length)
        return res.status(401).json({ message: "Invalid login details." });

      user = custRes.rows[0];
    }

    // Password check
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      const attempts = (user.failed_attempts || 0) + 1;
      let lockUntil = null;
      if (attempts >= MAX_ATTEMPTS)
        lockUntil = new Date(Date.now() + LOCK_TIME);

      await pool.query(
        `UPDATE ${table} SET failed_attempts=$1, lock_until=$2 WHERE id=$3`,
        [attempts, lockUntil, user.id],
      );

      await logAuthEvent({
        userId: user.id,
        userName: user.fullname,
        branchId: branchId || null,
        loginType,
        email,
        action: "LOGIN_FAILED",
        req,
      });

      return res.status(401).json({ message: "Invalid login details." });
    }

    // Reset failed attempts
    await pool.query(
      `UPDATE ${table} SET failed_attempts=0, lock_until=NULL WHERE id=$1`,
      [user.id],
    );

    // JWT token
    const token = signToken({
      id: user.id,
      fullname: user.fullname,
      roleid: roleId,
      branchId: loginType === "staff" ? branchId : null,
      loginType,
      permissions,
      passwordChangedAt: user.password_changed_at,
    });

    // Save session
    await pool.query(
      `INSERT INTO user_sessions (user_id, login_type, token, ip_address, user_agent, expires_at)
       VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '1 day')`,
      [user.id, loginType, token, req.ip, req.headers["user-agent"]],
    );

    await logAuthEvent({
      userId: user.id,
      userName: user.fullname,
      branchId: branchId || null,
      loginType,
      email,
      action: "LOGIN_SUCCESS",
      req,
    });

    res.status(200).json({
      token,
      loginType,
      roleId,
      roleName,
      defaultPage,
      permissions,
      name: user.fullname,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
