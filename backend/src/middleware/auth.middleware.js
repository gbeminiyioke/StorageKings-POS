import jwt, { decode } from "jsonwebtoken";
import pool from "../config/db.js";
import { JWT_SECRET } from "../config/jwt.js";

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const table = decoded.loginType === "staff" ? "users" : "customers";

    const result = await pool.query(
      `SELECT password_changed_at FROM ${table} WHERE id = $1`,
      [decoded.id],
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const passwordChangedAt = result.rows[0].password_changed_at;

    //INVALIDATE TOKEN IF PASSWORD WAS CHANGED AFTER TOKEN EXPIRES
    if (
      passwordChangedAt &&
      decoded.passwordChangedAt &&
      new Date(passwordChangedAt).getTime() !==
        new Date(decoded.passwordChangedAt).getTime()
    ) {
      return res
        .status(401)
        .json({ message: "Session expired. Please login again" });
    }

    // ATTACH DECODED TOKEN TO REQUEST
    req.user = decoded;

    next();
  } catch {
    res.status(401).json({ message: "Invaid or expired token" });
  }
};
