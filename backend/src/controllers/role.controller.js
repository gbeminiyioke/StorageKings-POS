import pool from "../config/db.js";
import activityMiddleware from "../middleware/activityMiddleware.js";

const PERMISSION_COLUMNS = [
  //RIGHTS
  "can_view",
  "can_create",
  "can_edit",
  "can_delete",
  "can_view_security",

  //MODULES
  "dashboard",
  "sales",
  "inventory",
  "storage",
  "transfer",
  "customers",
  "receive_items",
  "discharge_items",
  "pos_terminals",
  "branches",
  "roles",
  "users",
  "security",
  "reports_and_analytics",
  "audit_log",
];

/*=========================================
  CREATE ROLE
  ========================================= */

const createRoleController = async (req, res) => {
  const client = await pool.connect();

  try {
    const { role_name, role_description, default_page, enable, permissions } =
      req.body;

    if (!role_name) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const atLeastOneRight =
      permissions.can_view ||
      permissions.can_create ||
      permissions.can_edit ||
      permissions.can_delete ||
      permissions.can_view_security;

    if (!atLeastOneRight) {
      return res.status(400).json({
        message: "At lease one right must be selected",
      });
    }

    await client.query("BEGIN");

    const roleRes = await client.query(
      `
      INSERT INTO roles (role_name, role_description, default_page, enable)
      VALUES ($1, $2, $3, $4)
      RETURNING role_id`,
      [role_name, role_description, default_page, enable],
    );

    const role_id = roleRes.rows[0].role_id;

    const values = PERMISSION_COLUMNS.map((col) => !!permissions[col]);

    await client.query(
      `
      INSERT INTO role_permissions (role_id, ${PERMISSION_COLUMNS.join(",")}) VALUES ($1, ${PERMISSION_COLUMNS.map((_, i) => `$${i + 2}`).join(",")})
      `,
      [role_id, ...values],
    );

    await client.query("COMMIT");

    res.json({ message: "Role created successfully!" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to create role" });
  } finally {
    client.release();
  }
};

export const createRole = activityMiddleware(
  "Roles",
  "Create",
  (req) => `Created role - ${req.body.role_name}`,
)(createRoleController);

/*==========================================
  GER ROLES
  ========================================== */
export const getRoles = async (req, res) => {
  const result = await pool.query(
    `
    SELECT r.*, rp.*
    FROM roles r
    JOIN role_permissions rp ON r.role_id = rp.role_id
    ORDER BY r.role_id
    `,
  );
  res.json(result.rows);
};

/*==========================================
  UPDATE ROLES
  ========================================== */

const updateRoleController = async (req, res) => {
  try {
    const { role_id } = req.params;
    const { role_name, role_description, default_page, enable, permissions } =
      req.body;
    /*
    await pool.query("BEGIN");

    //GET OLD ROLE NAME FOR AUDIT

    const oldRole = await client.query(
      "SELECT role_name FROM roles WHERE role_id = $1",
      [role_id],
    );
*/
    await pool.query(
      "UPDATE roles SET role_name=$1, role_description=$2, default_page=$3, enable=$4 WHERE role_id=$5",
      [role_name, role_description, default_page, enable, role_id],
    );

    const fields = PERMISSION_COLUMNS.map((col, i) => `${col}=$${i + 1}`).join(
      ",",
    );

    const values = PERMISSION_COLUMNS.map((col) => !!permissions[col]);

    await pool.query(
      `UPDATE role_permissions SET ${fields} WHERE role_id=$${values.length + 1}`,
      [...values, role_id],
    );

    res.json({ message: "Role updated successfuly!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update role" });
  }
};

export const updateRole = activityMiddleware(
  "Roles",
  "Update",
  (req) => `Update role = ${req.body.role_name}`,
)(updateRoleController);

/*=========================================
  DELETE ROLE
  ========================================= */
const deleteRoleController = async (req, res) => {
  try {
    const { role_id } = req.params;

    //GET ROLE NAME BEFORE DELETE
    const roleCheck = await pool.query(
      "SELECT role_name FROM roles WHERE role_id = $1",
      [role_id],
    );

    if (!roleCheck.rows.length) {
      return res.status(404).json({ message: "Role not found!" });
    }

    const roleName = roleCheck.rows[0].role_name;

    //CHECK IF ROE IS ATTACHED TO ANY USERS
    const attachedUsers = await pool.query(
      "SELECT COUNT(*) FROM users where role_id = $1",
      [role_id],
    );

    if (parseInt(attachedUsers.rows[0].count) > 0) {
      //PREVENT ACTIVITY LOG
      res.locals.skipActivityLog = true;

      return res.json({ attachedUsers: true });
    }

    //DELETE PERMISSIONS FIRST (IF FK EXISTS)
    await pool.query("DELETE FROM role_permissions WHERE role_id = $1", [
      role_id,
    ]);

    //DELETE ROLE
    await pool.query(`DELETE FROM roles WHERE role_id = $1`, [role_id]);

    req.deletedRoleName = roleName;

    //res.json({ message: "Role deleted!" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete role" });
  }
};

export const deleteRole = activityMiddleware(
  "Roles",
  "Delete",
  (req) => `Deleted role - ${req.deletedRoleName || "unknown"}`,
)(deleteRoleController);
