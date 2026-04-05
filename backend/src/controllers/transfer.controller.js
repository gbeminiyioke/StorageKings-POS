import pool from "../config/db.js";

/* ==========================================
   GET USER ACCESSIBLE SOURCE BRANCHES
========================================== */
export const getTransferBranches = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT b.branch_id, b.branch_name, b.branch_prefix
       FROM user_branches ub
       JOIN branches b ON b.branch_id = ub.branch_id
       WHERE ub.user_id = $1
         AND b.enable = true
       ORDER BY b.branch_name`,
      [userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user branches" });
  }
};

/* ==========================================
   GET NEXT TRANSFER NUMBER
========================================== */
export const getNextTransferNo = async (req, res) => {
  try {
    const { branch_id } = req.params;

    const result = await pool.query(
      `SELECT branch_prefix, next_transfer_no
       FROM branches
       WHERE branch_id = $1 AND enable = true`,
      [branch_id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const { branch_prefix, next_transfer_no } = result.rows[0];

    const formatted = String(next_transfer_no).padStart(7, "0");
    const transfer_no = `T${branch_prefix}-${formatted}`;

    res.json({ transfer_no });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch transfer number" });
  }
};

/* ==========================================
   SEARCH PRODUCT FOR TRANSFER
========================================== */
export const searchTransferProducts = async (req, res) => {
  try {
    const { q, branch_id } = req.query;

    if (!q || !branch_id) {
      return res.json({ data: [] });
    }

    const result = await pool.query(
      `SELECT
          p.product_id,
          p.product_code,
          p.product_name,
          p.unit,
          p.minimum_quantity,
          COALESCE(pbb.stock_quantity,0) AS stock_quantity
       FROM products p
       JOIN products_by_branch pbb
         ON pbb.product_id = p.product_id
       WHERE p.deleted = false
         AND p.storage = false
         AND pbb.branch_id = $1
         AND p.product_name ILIKE $2
       ORDER BY p.product_name
       LIMIT 20`,
      [branch_id, `%${q}%`],
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to search products" });
  }
};

/* ==========================================
   BARCODE LOOKUP FOR TRANSFER
========================================== */
export const getTransferProductByBarcode = async (req, res) => {
  try {
    const { product_code } = req.params;
    const { branch_id } = req.query;

    const result = await pool.query(
      `SELECT
          p.product_id,
          p.product_code,
          p.product_name,
          p.unit,
          p.minimum_quantity,
          COALESCE(pbb.stock_quantity,0) AS stock_quantity
       FROM products p
       JOIN products_by_branch pbb
         ON pbb.product_id = p.product_id
       WHERE p.product_code = $1
         AND pbb.branch_id = $2
         AND p.deleted = false
         AND p.storage = false
         `,
      [product_code, branch_id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

/* ==========================================
   CREATE / POST TRANSFER
========================================== */
export const createTransfer = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      transfer_date,
      from_branch_id,
      to_branch_id,
      transferred_by,
      checked_by,
      received_by,
      items,
    } = req.body;

    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one product must be selected",
      });
    }

    const today = new Date();
    const selected = new Date(transfer_date);

    if (selected > today) {
      return res.status(400).json({
        message: "Transfer date cannot be in the future",
      });
    }

    const branchRes = await client.query(
      `SELECT branch_prefix, next_transfer_no
       FROM branches
       WHERE branch_id = $1
       FOR UPDATE`,
      [from_branch_id],
    );

    if (!branchRes.rows.length) {
      throw new Error("Source branch not found");
    }

    const branch = branchRes.rows[0];
    const transferNo = `T${branch.branch_prefix}-${String(
      branch.next_transfer_no,
    ).padStart(7, "0")}`;

    for (const item of items) {
      const stockCheck = await client.query(
        `SELECT
            p.product_name,
            p.minimum_quantity,
            COALESCE(pbb.stock_quantity,0) AS stock_quantity
         FROM products p
         JOIN products_by_branch pbb
           ON pbb.product_id = p.product_id
         WHERE p.product_id = $1
           AND pbb.branch_id = $2
         FOR UPDATE`,
        [item.product_id, from_branch_id],
      );

      const product = stockCheck.rows[0];

      if (!product) {
        throw new Error("Product not found in source branch");
      }

      if (Number(item.quantity) > Number(product.stock_quantity)) {
        throw new Error(
          `${product.product_name} quantity exceeds available stock`,
        );
      }
    }

    const transferRes = await client.query(
      `INSERT INTO stock_transfers (
          from_branch_id,
          to_branch_id,
          transfer_no,
          transfer_date,
          transferred_by,
          checked_by,
          received_by,
          status,
          created_by,
          posted_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'POSTED',$8,NOW())
       RETURNING transfer_id`,
      [
        from_branch_id,
        to_branch_id,
        transferNo,
        transfer_date,
        transferred_by,
        checked_by,
        received_by,
        userId,
      ],
    );

    const transfer_id = transferRes.rows[0].transfer_id;

    for (const item of items) {
      await client.query(
        `INSERT INTO stock_transfer_details (
            transfer_id,
            product_id,
            quantity
         ) VALUES ($1,$2,$3)`,
        [transfer_id, item.product_id, item.quantity],
      );

      await client.query(
        `UPDATE products_by_branch
         SET stock_quantity = stock_quantity - $1
         WHERE product_id = $2 AND branch_id = $3`,
        [item.quantity, item.product_id, from_branch_id],
      );

      const sourceBalance = await client.query(
        `SELECT stock_quantity
         FROM products_by_branch
         WHERE product_id = $1 AND branch_id = $2`,
        [item.product_id, from_branch_id],
      );

      const destinationExists = await client.query(
        `SELECT id
         FROM products_by_branch
         WHERE product_id = $1 AND branch_id = $2`,
        [item.product_id, to_branch_id],
      );

      if (!destinationExists.rows.length) {
        await client.query(
          `INSERT INTO products_by_branch (
              product_id,
              branch_id,
              stock_quantity,
              selling_price,
              auto_price_sync,
              reserved_quantity
           )
           SELECT
             product_id,
             $2,
             0,
             selling_price,
             true,
             0
           FROM products_by_branch
           WHERE product_id = $1
           LIMIT 1`,
          [item.product_id, to_branch_id],
        );
      }

      await client.query(
        `UPDATE products_by_branch
         SET stock_quantity = stock_quantity + $1
         WHERE product_id = $2 AND branch_id = $3`,
        [item.quantity, item.product_id, to_branch_id],
      );

      const destinationBalance = await client.query(
        `SELECT stock_quantity
         FROM products_by_branch
         WHERE product_id = $1 AND branch_id = $2`,
        [item.product_id, to_branch_id],
      );

      await client.query(
        `INSERT INTO stock_movements (
            product_id,
            branch_id,
            movement_type,
            quantity,
            reference_id,
            reference_table,
            created_by,
            balance_after
         ) VALUES ($1,$2,'TRANSFER OUT',$3,$4,'stock_transfer',$5,$6)`,
        [
          item.product_id,
          from_branch_id,
          -Math.abs(item.quantity),
          transfer_id,
          userId,
          sourceBalance.rows[0].stock_quantity,
        ],
      );

      await client.query(
        `INSERT INTO stock_movements (
            product_id,
            branch_id,
            movement_type,
            quantity,
            reference_id,
            reference_table,
            created_by,
            balance_after
         ) VALUES ($1,$2,'TRANSFER IN',$3,$4,'stock_transfer',$5,$6)`,
        [
          item.product_id,
          to_branch_id,
          Math.abs(item.quantity),
          transfer_id,
          userId,
          destinationBalance.rows[0].stock_quantity,
        ],
      );
    }

    await client.query(
      `UPDATE branches
       SET next_transfer_no = next_transfer_no + 1
       WHERE branch_id = $1`,
      [from_branch_id],
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Transfer posted successfully",
      transfer_id,
      transfer_no: transferNo,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: err.message || "Transfer failed" });
  } finally {
    client.release();
  }
};

/* ==========================================
   GET RECENT TRANSFERS
========================================== */
export const getRecentTransfers = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    const data = await pool.query(
      `SELECT
          st.transfer_id,
          st.transfer_date,
          st.transfer_no,
          fb.branch_name AS from_branch,
          tb.branch_name AS to_branch,
          st.status
       FROM stock_transfers st
       JOIN branches fb ON fb.branch_id = st.from_branch_id
       JOIN branches tb ON tb.branch_id = st.to_branch_id
       WHERE st.transfer_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY st.transfer_date DESC, st.transfer_id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const total = await pool.query(
      `SELECT COUNT(*)
       FROM stock_transfers
       WHERE transfer_date >= CURRENT_DATE - INTERVAL '30 days'`,
    );

    res.json({
      data: data.rows,
      total: Number(total.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch transfers" });
  }
};
