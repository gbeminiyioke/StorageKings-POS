import pool from "../config/db.js";
/*==========================================
  GET NEXT GRN NUMBER FOR BRANCH
============================================*/
export const getNextGRN = async (req, res) => {
  const { branch_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT branch_prefix, next_grn_no FROM branches WHERE branch_id = $1`,
      [branch_id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const { branch_prefix, next_grn_no } = result.rows[0];

    const formattedNo = String(next_grn_no).padStart(6, "0");
    const grn = `${branch_prefix}-${formattedNo}`;

    res.json({ grn });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch GRN number " });
  }
};

/*==========================================
  GET BRANCHES (OPTIONAL FILTER BY BUSINESS)
============================================*/
export const getBranches = async (req, res) => {
  try {
    const { business_id } = req.query;

    let query = `SELECT b.*, bus.business_name FROM branches b
    JOIN business bus ON bus.business_id = b.business_id`;

    let params = [];

    if (business_id) {
      query += ` WHERE b.business_id = $1`;
      params.push(business_id);
    }

    query += ` ORDER BY b.branch_id`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch branches." });
  }
};

/*==========================================
  GET ENABLED BRANCHES (PUBLIC - LOGIN USE)
============================================*/
export const getEnabledBranches = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT branch_id, branch_name, branch_prefix
       FROM branches
       WHERE enable = true
       ORDER BY branch_name`,
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch branches." });
  }
};

/*==========================================
  CREATE BRANCH
============================================*/
export const createBranch = async (req, res) => {
  const {
    business_id,
    branch_name,
    branch_address,
    branch_email,
    branch_telephone,
    enable,
    hq_branch,
    branch_prefix,
    comments,
  } = req.body;

  if (!business_id)
    return res.status(400).json({ message: "Business is required" });
  if (!branch_name)
    return res.status(400).json({ message: "Branch name is required" });
  if (!branch_address)
    return res.status(400).json({ message: "Branch address is required" });
  if (!branch_prefix)
    return res.status(400).json({ message: "Branch prefix is required" });

  const prefix = branch_prefix.toUpperCase();

  if (!/^[A-Z]$/.test(prefix))
    return res.status(400).json({
      message: "Branch prefix must be single aphabet character (A-Z only)",
    });

  try {
    const business = await pool.query(
      `SELECT max_branches, current_branches FROM business WHERE business_id = $1 AND enable = true`,
      [business_id],
    );

    if (!business.rows.length) {
      return res.status(404).json({ message: "Business not found!" });
    }

    const { max_branches, current_branches } = business.rows[0];

    if (current_branches >= max_branches) {
      return res
        .status(400)
        .json({ message: "Maximum number of branches reached" });
    }

    //unique branch per business
    const duplicate = await pool.query(
      `SELECT 1 FROM branches WHERE business_id = $1 AND LOWER(branch_name) = LOWER($2)`,
      [business_id, branch_name],
    );

    if (duplicate.rows.length)
      return res
        .status(400)
        .json({ message: "Branch name already exists for the business" });

    //ONLY ONE HQ PER BUSINESS
    if (hq_branch) {
      const existingHQ = await pool.query(
        `SELECT 1 FROM branches WHERE business_id = $1 AND hq_branch = true`,
        [business_id],
      );

      if (existingHQ.rows.length)
        return res
          .status(400)
          .json({ message: "Only one HQ branch can exist" });
    }

    const dupicatePrefix = await pool.query(
      `SELECT 1 FROM branches WHERE business_id = $1 AND branch_prefix = $2`,
      [business_id, prefix],
    );

    if (dupicatePrefix.rows.length)
      return res.status(400).json({ message: "Branch prefix already exists" });

    await pool.query(
      `INSERT INTO branches (
        business_id,
        branch_name,
        branch_address,
        branch_email,
        branch_telephone,
        enable,
        hq_branch,
        branch_prefix,
        comments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        business_id,
        branch_name,
        branch_address,
        branch_email,
        branch_telephone,
        enable,
        hq_branch,
        prefix,
        comments,
      ],
    );

    await pool.query(
      `UPDATE business
      SET current_branches = current_branches + 1
      WHERE business_id = $1`,
      [business_id],
    );

    res.status(201).json({ message: "Branch created successfuly." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create branch." });
  }
};

/*=========================================
  UPDATE BRANCH
===========================================*/
export const updateBranch = async (req, res) => {
  const { id } = req.params;
  const {
    business_id,
    branch_name,
    branch_address,
    branch_email,
    branch_telephone,
    enable,
    hq_branch,
    branch_prefix,
    comments,
  } = req.body;

  try {
    //UNIQUE BRANCH NAME CHECK
    const duplicate = await pool.query(
      `SELECT 1 FROM branches WHERE business_id = $1 AND LOWER(branch_name) = LOWER($2) AND branch_id != $3`,
      [business_id, branch_name, id],
    );

    if (duplicate.rows.length)
      return res.status(400).json({ message: "Branch name already exists" });

    //HQ VALIDATION
    if (hq_branch) {
      const existingHQ = await pool.query(
        `SELECT 1 FROM branches WHERE business_id = $1 AND hq_branch = true AND branch_id != $2`,
        [business_id],
      );

      if (existingHQ.rows.length)
        return res
          .status(400)
          .json({ message: "Only one HQ branch can exist" });
    }

    if (!branch_prefix)
      return res.status(400).json({ message: "Branch prefix is required" });

    const prefix = branch_prefix.toUpperCase();

    if (!/^[A-Z]$/.test(prefix))
      return res.status(400).json({
        message: "Branch prefix must be single aphabet character (A-Z only)",
      });

    const duplicatePrefix = await pool.query(
      `SELECT 1 FROM branches
   WHERE business_id = $1
   AND branch_prefix = $2
   AND branch_id != $3`,
      [business_id, prefix, id],
    );

    if (duplicatePrefix.rows.length)
      return res.status(400).json({
        message: "Branch prefix already exists",
      });

    await pool.query(
      `UPDATE branches SET branch_name = $1,
      branch_address = $2,
      branch_email = $3,
      branch_telephone = $4,
      enable = $5,
      hq_branch = $6,
      branch_prefix = $7,
      comments = $8 WHERE branch_id = $9`,
      [
        branch_name,
        branch_address,
        branch_email,
        branch_telephone,
        enable,
        hq_branch,
        branch_prefix,
        comments,
        id,
      ],
    );

    res.json({ message: "Branch updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Faied to update branch" });
  }
};

/*=========================================
  DELETE BRANCH
===========================================*/
export const deleteBranch = async (req, res) => {
  const { id } = req.params;

  try {
    const branch = await pool.query(
      `SELECT business_id FROM branches WHERE branch_id = $1`,
      [id],
    );

    if (!branch.rows.length)
      return res.status(404).json({ message: "Branch not found" });

    await pool.query(`DELETE FROM branches WHERE branch_id = $1`, [id]);

    await pool.query(
      `UPDATE business SET current_branches = current_branches - 1 WHERE business_id = $1`,
      [branch.rows[0].business_id],
    );

    res.json({ message: "Branch deeted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete branch" });
  }
};
