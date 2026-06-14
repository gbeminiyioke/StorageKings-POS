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
  customerId,
  userName,
  branchId,
  loginType,
  email,
  action,
  req,
}) => {
  try {
    await logActivity({
      userId: loginType === "customer" ? userId : null,
      customerId: loginType === "customer" ? customerId : null,
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
      userId: loginType === "staff" ? userResult.rows[0].id : null,
      customerId: loginType === "customer" ? userResult.rows[0].id : null,
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
      userId: type === "staff" ? userId : null,
      customerId: type === "customer" ? userId : null,
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
  const { email, password, loginType, branchId, deviceFingerprint } = req.body;
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

      const existingBranchSession = await pool.query(
        `
        SELECT id
        FROM user_sessions
        WHERE user_id = $1
        AND login_type = 'staff'
        AND branch_id = $2
        AND is_active = true
        `,
        [user.id, branchId],
      );

      if (existingBranchSession.rows.length) {
        const existingSession = await pool.query(
          `
          SELECT id, device_fingerprint
          FROM user_sessions
          WHERE user_id = $1
          AND login_type = 'staff'
          AND branch_id = $2
          AND is_active = true
          `,
          [user.id, branchId],
        );

        if (
          existingSession.rows.length &&
          existingSession.rows[0].device_fingerprint !== deviceFingerprint
        ) {
          return res.status(409).json({
            message:
              "You are already logged into this branch from another device.",
          });
        }
      }

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

      const existingCustomerSession = await pool.query(
        `
        SELECT id
        FROM user_sessions
        WHERE user_id = $1
        AND login_type='customer'
        AND is_active=true
        `,
        [user.id],
      );

      if (existingCustomerSession.rows.length) {
        return res.status(409).json({
          message: "Your account is already logged in on another device.",
        });
      }
    }

    // Password check
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      const attempts = (user.failed_attempts || 0) + 1;
      let lockUntil = null;
      if (attempts >= MAX_ATTEMPTS)
        lockUntil = new Date(Date.now() + LOCK_TIME);

      if (loginType === "staff") {
        await pool.query(
          `UPDATE ${table} SET failed_attempts=$1, lock_until=$2 WHERE id=$3`,
          [attempts, lockUntil, user.id],
        );
      }
      //[loginType === "staff" ? "userId" : "customerId"]: user.id,
      await logAuthEvent({
        userId: loginType === "staff" ? user.id : null,
        customerId: loginType === "customer" ? user.id : null,
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
      email: user.email,
      fullname: user.fullname,
      roleid: roleId,
      branchId: loginType === "staff" ? branchId : null,
      loginType,
      permissions,
      passwordChangedAt: user.password_changed_at,
    });

    // Save session
    await pool.query(
      `INSERT INTO user_sessions (user_id, login_type, branch_id, token, ip_address, user_agent, device_fingerprint, expires_at, last_activity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW() + INTERVAL '1 day', NOW())`,
      [
        user.id,
        loginType,
        loginType === "staff" ? branchId : null,
        token,
        req.ip,
        req.headers["user-agent"],
        deviceFingerprint,
      ],
    );

    await logAuthEvent({
      userId: loginType === "staff" ? user.id : null,
      customerId: loginType === "customer" ? user.id : null,
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

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(400).json({
        message: "Token required",
      });
    }

    await pool.query(
      `
      UPDATE user_sessions
      SET is_active = false,
      last_activity = NOW()
      WHERE token = $1
      AND is_active = true
      `,
      [token],
    );

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Logout failed",
    });
  }
};

export const getActiveSessions = async (req, res) => {
  try {
    const email = req.user.email;

    const sessions = await pool.query(
      `
      SELECT us.id, us.login_type, us.branch_id, us.ip_address, us.user_agent, us.device_fingerprint, us.created_at, us.last_activity,
      
      CASE
        WHEN us.login_type = 'staff'
        THEN u.email
      ELSE c.email
      END AS email
      
      FROM user_sessions us
      
      LEFT JOIN users u
      ON us.login_type = 'staff'
      AND us.user_id = u.id
      
      LEFT JOIN customers c
      ON us.login_type = 'customer'
      AND us.user_id = c.id
      WHERE 
        (
          u.email = $1
          OR
          c.email = $1
        )
      AND us.is_active = true
      ORDER BY us.created_at DESC
      `,
      [email],
    );

    return res.json(sessions.rows);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to load sessions",
    });
  }
};

export const kickSession = async (req, res) => {
  const { sessionId } = req.body;

  try {
    await pool.query(
      `
      UPDATE user_sessions
      SET is_active = false
      WHERE id = $1
      `,
      [sessionId],
    );

    return res.json({
      message: "Session terminated",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to terminate session",
    });
  }
};

export const getAllActiveSessions = async (req, res) => {
  try {
    const sessions = await pool.query(
      `
      SELECT
        us.id,
        us.login_type,
        us.branch_id,
        us.ip_address,
        us.user_agent,
        us.device_fingerprint,
        us.created_at,
        us.last_activity,

        CASE
          WHEN us.login_type = 'staff'
            THEN u.email
          ELSE c.email
        END AS email,

        CASE
          WHEN us.login_type = 'staff'
            THEN u.fullname
          ELSE c.fullname
        END AS fullname,

        b.branch_name

      FROM user_sessions us

      LEFT JOIN users u
        ON us.login_type='staff'
       AND us.user_id=u.id

      LEFT JOIN customers c
        ON us.login_type='customer'
       AND us.user_id=c.id

      LEFT JOIN branches b
        ON us.branch_id=b.branch_id

      WHERE us.is_active=true

      ORDER BY us.last_activity DESC
      `,
    );

    res.json(sessions.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to load sessions",
    });
  }
};

export const adminKickSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    await pool.query(
      `
      UPDATE user_sessions
      SET is_active = false
      WHERE id = $1
      `,
      [sessionId],
    );

    res.json({
      message: "Session terminated successfully",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to terminate session",
    });
  }
};

export const getSessionStatistics = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
      COUNT(*) FILTER (
        WHERE is_active = true
      ) AS total_active,

      COUNT(*) FILTER (
        WHERE is_active = true
        AND login_type='staff'
      ) AS active_staff,

      COUNT(*) FILTER (
        WHERE is_active = true
        AND login_type='customer'
      ) AS active_customers,

      COUNT(DISTINCT branch_id) FILTER (
          WHERE is_active = true
          AND branch_id IS NOT NULL
        ) AS active_branches

      FROM user_sessions
    `);

    return res.json(stats.rows[0]);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to load session statistics",
    });
  }
};
