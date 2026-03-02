import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/*-------------------------------------------
  GET ALL BUSINESSES
---------------------------------------------*/
export const getBusiness = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        business_id,
        business_name,
        db_user,
        db_name,
        db_password,
        max_branches,
        current_branches,
        created_at
        FROM business
        ORDER BY created_at DESC
    `);

    res.status(200).json(result.rows);

    /*
    if (!result.rows.length) {
      return res.status(404).json({ message: "Business not found." });
    }

    res.json(result.rows[0]);
    */
  } catch (err) {
    console.error("GET BUSINESS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/*-------------------------------------------
  CREATE BUSINESS
---------------------------------------------*/
export const createBusiness = async (req, res) => {
  const { business_name, db_user, db_name, db_password, max_branches } =
    req.body;

  if (
    !business_name ||
    !db_user ||
    !db_name ||
    !db_password ||
    max_branches === undefined
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const business_id = uuidv4();

    const result = await pool.query(
      `
      INSERT INTO business (
        business_id,
        business_name,
        db_user,
        db_name,
        db_password,
        max_branches,
        current_branches
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0)
      RETURNING *
      `,
      [
        business_id,
        business_name.trim(),
        db_user.trim(),
        db_name.trim(),
        db_password,
        Number(max_branches),
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE BUSINESS ERROR:", err);
    res.status(500).json({ message: "Server error!" });
  }
};

/*-------------------------------------------
  UPDATE BUSINESS
---------------------------------------------*/
export const updateBusiness = async (req, res) => {
  const { business_id } = req.params;
  const { business_name, db_user, db_name, db_password, max_branches } =
    req.body;

  if (
    !business_name ||
    !db_user ||
    !db_name ||
    !db_password ||
    max_branches === undefined
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE business
      SET
        business_name = $1,
        db_user = $2,
        db_name = $3,
        db_password = $4,
        max_branches = $5
      WHERE business_id = $6
      RETURNING *
      `,
      [
        business_name.trim(),
        db_user.trim(),
        db_name.trim(),
        db_password,
        Number(max_branches),
        business_id,
      ],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Business not found!" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE BUSINESS ERROR:", err);
    res.status(500).json({ message: "Server error!" });
  }
};

/*-------------------------------------------
  DELETE BUSINESS
---------------------------------------------*/
export const deleteBusiness = async (req, res) => {
  const { business_id } = req.params;

  try {
    //OPTIONAL SAFETY CHECK
    const branchCheck = await pool.query(
      `SELECT COUNT(*) FROM branches WHERE business_id = $1`,
      [business_id],
    );

    if (Number(branchCheck.rows[0].count) > 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete business with existing branches." });
    }

    const result = await pool.query(
      `
      DELETE FROM business
      WHERE business_id = $1
      RETURNING *
      `,
      [business_id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Business not found!" });
    }

    res.status(200).json({ message: "Business deeted successfuly!" });
  } catch (err) {
    console.error("DELETE BUSINESS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
