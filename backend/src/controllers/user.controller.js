import pool from "../config/db.js";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import activityMiddleware from "../middleware/activityMiddleware.js";

/*====================================
  GET USERS
======================================*/
const getUsersController = async (req, res) => {
  const result = await pool.query(
    `SELECT id, fullname, email, enable FROM users where deleted = false ORDER BY fullname`,
  );

  res.json(result.rows);
};

export const getUsers = activityMiddleware(
  "Users",
  "View",
  () => "Viewed users list",
)(getUsersController);

/*===========================================
  GET USER BRANCHES
=============================================*/
const getUserBranchesController = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ubr.branch_id, b.branch_name, ubr.role_id, r.role_name, r.role_description FROM user_branch_roles ubr
      JOIN branches b ON b.branch_id = ubr.branch_id
      JOIN roles r ON r.role_id = ubr.role_id WHERE ubr.user_id = $1`,
      [id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load user access data" });
  }
};

export const getUserBranches = activityMiddleware(
  "Users",
  "View",
  (req) => `Viewed user access - ${req.params.id}`,
)(getUserBranchesController);

/*===========================================
  CREATE USER
=============================================*/
const createUserController = async (req, res) => {
  const client = await pool.connect();

  try {
    const { fullname, email, password, enable, branchRoles } = req.body;

    if (!fullname)
      return res.status(400).json({ message: "Fullname required" });
    if (!email) return res.status(400).json({ message: "Email is required" });
    if (!password)
      return res.status(400).json({ message: "Password is required" });

    if (!branchRoles || branchRoles.length === 0) {
      return res
        .status(400)
        .json({ message: "All least one branch must be selected" });
    }

    await client.query("BEGIN");

    //CHECK THAT EMAIL IS UNIQUE
    const emailCheck = await client.query(
      `SELECT id FROM users WHERE email=$1`,
      [email],
    );

    if (emailCheck.rows.length) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const userInsert = await client.query(
      `INSERT INTO users (fullname, email, password, enable) VALUES ($1, $2, $3, $4) RETURNING id`,
      [fullname, email, hashed, enable ?? true],
    );

    const userId = userInsert.rows[0].id;

    for (const item of branchRoles) {
      await client.query(
        `INSERT INTO user_branches (id, user_id, branch_id) VALUES ($1, $2, $3)`,
        [uuid(), userId, item.branch_id],
      );

      await client.query(
        `INSERT INTO user_branch_roles (id, user_id, branch_id, role_id) VALUES ($1, $2, $3, $4)`,
        [uuid(), userId, item.branch_id, item.role_id],
      );
    }

    await client.query("COMMIT");

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to create user" });
  } finally {
    client.release();
  }
};

export const createUser = activityMiddleware(
  "Users",
  "Create",
  (req) => `Created user - ${req.body.fullname}`,
)(createUserController);

/*===========================================
  UPDATE USER
=============================================*/
const UpdateUserController = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { fullname, email, enable, branchRoles } = req.body;

    await client.query("BEGIN");

    //CHECK EMAIL IS UNIQUE (EXCLUDE SELF)
    const emailCheck = await client.query(
      `SELECT id FROM users WHERE email = $1 and id <> $2`,
      [email, id],
    );

    if (emailCheck.rows.length) {
      return res.status(400).json({ message: "Email already in use" });
    }

    await client.query(
      `UPDATE users SET fullname = $1, email = $2, enable = $3 WHERE id = $4`,
      [fullname, email, enable, id],
    );

    await client.query(`DELETE FROM user_branches WHERE user_id = $1`, [id]);
    await client.query(`DELETE FROM user_branch_roles WHERE user_id = $1`, [
      id,
    ]);

    for (const item of branchRoles) {
      await client.query(
        `INSERT INTO user_branches (id, user_id, branch_id) VALUES ($1, $2, $3)`,
        [uuid(), id, item.branch_id],
      );

      await client.query(
        `INSERT INTO user_branch_roles (id, user_id, branch_id, role_id) VALUES ($1, $2, $3, $4)`,
        [uuid(), id, item.branch_id, item.role_id],
      );
    }

    await client.query("COMMIT");

    res.json({ message: "User updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to update user" });
  } finally {
    client.release();
  }
};

export const updateUser = activityMiddleware(
  "Users",
  "Update",
  (req) => `Updated user - ${req.body.fullname}`,
)(UpdateUserController);

/*==========================================
  DELETE USER
============================================*/
const deleteUserController = async (req, res) => {
  await pool.query(`UPDATE users SET deleted = true where id=$1`, [
    req.params.id,
  ]);

  res.json({ message: "User deleted successfully" });
};

export const deleteUser = activityMiddleware(
  "Users",
  "Delete",
  (req) => `Deleted user - ${req.params.id}`,
)(deleteUserController);
