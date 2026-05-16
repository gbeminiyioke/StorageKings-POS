import pool from "../config/db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { sendEmail } from "../utils/mailer.js";
import logActivity from "../utils/activityLogger.js";

/* ======================================================
   HELPER: BUILD FILTERS SAFELY
====================================================== */
const buildFilters = ({ branchId, from, to }, alias = "") => {
  let conditions = "";
  const params = [];

  if (branchId) {
    params.push(branchId);
    conditions += ` AND ${alias}branch_id = $${params.length}`;
  }

  if (from) {
    params.push(from);
    conditions += ` AND ${alias}created_at >= $${params.length}`;
  }

  if (to) {
    params.push(to);
    conditions += ` AND ${alias}created_at <= $${params.length}`;
  }

  return { conditions, params };
};

/* ======================================================
   INVENTORY METRICS
====================================================== */
export const getInventoryMetrics = async (req, res) => {
  try {
    // =========================
    // SANITIZE INPUTS
    // =========================
    const branchId =
      req.query.branch_id && req.query.branch_id !== ""
        ? Number(req.query.branch_id)
        : null;

    const from = req.query.from || null;
    const to = req.query.to || null;

    console.log("Inventory Metrics Request:", {
      raw: req.query.branch_id,
      parsed: branchId,
      from,
      to,
    });

    // =========================
    // STORAGE CAPACITY
    // =========================
    const capacityParams = [];
    let capacityCondition = "";

    if (branchId) {
      capacityParams.push(branchId);
      capacityCondition = `AND b.branch_id = $${capacityParams.length}`;
    }

    const capacity = await pool.query(
      `
      SELECT
        b.branch_id,
        b.branch_name,
        p.product_id,
        p.product_name AS storage_name,

        COALESCE(pbb.stock_quantity, 0) AS total_capacity,

        (
          SELECT COUNT(*)
          FROM storage_headers sh
          WHERE sh.branch_id = b.branch_id
            AND sh.storage_space_product_id = p.product_id
            AND sh.deleted = false
        ) AS occupied_capacity,

        COALESCE(pbb.stock_quantity, 0) -
        (
          SELECT COUNT(*)
          FROM storage_headers sh
          WHERE sh.branch_id = b.branch_id
            AND sh.storage_space_product_id = p.product_id
            AND sh.deleted = false
        ) AS available_capacity

      FROM products p
      INNER JOIN products_by_branch pbb
        ON p.product_id = pbb.product_id
      INNER JOIN branches b
        ON b.branch_id = pbb.branch_id

      WHERE p.storage = true
        AND p.can_be_sold = true
        ${branchId ? "AND b.branch_id = $1" : ""}

      ORDER BY b.branch_name, p.product_name
      `,
      branchId ? [branchId] : [],
    );

    // =========================
    // DISCHARGE STATS
    // =========================
    const dischargeFilter = buildFilters({ branchId, from, to }, "");

    const dischargeStats = await pool.query(
      `
      SELECT
        COUNT(*) AS total_discharges,
        COUNT(*) FILTER (WHERE approval_status='PENDING') AS pending,
        COUNT(*) FILTER (WHERE approval_status='APPROVED') AS approved,
        COUNT(*) FILTER (WHERE approval_status='REJECTED') AS rejected,
        COUNT(*) FILTER (WHERE approval_status='REVERSED') AS reversed,
        COUNT(*) FILTER (WHERE approval_status='PENDING_REVERSAL') AS pending_reversal
      FROM discharge_headers
      WHERE deleted = false
      ${dischargeFilter.conditions}
      `,
      dischargeFilter.params,
    );

    // =========================
    // STORAGE STATS
    // =========================
    const storageFilter = buildFilters({ branchId, from, to }, "");

    const storageStats = await pool.query(
      `
      SELECT
        COUNT(*) AS total_storages,
        COUNT(*) FILTER (WHERE status='ACTIVE') AS active,
        COUNT(*) FILTER (WHERE status='PARTIAL') AS partial
      FROM storage_headers
      WHERE deleted = false
      ${storageFilter.conditions}
      `,
      storageFilter.params,
    );

    console.log("Capacity:", capacity.rows);
    console.log("Discharge:", dischargeStats.rows);
    console.log("Storage:", storageStats.rows);

    res.json({
      capacity: capacity.rows,
      discharge: dischargeStats.rows[0] || {},
      storage: storageStats.rows[0] || {},
    });
  } catch (err) {
    console.error("Inventory Metrics Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   INVENTORY TRENDS
====================================================== */
export const getInventoryTrends = async (req, res) => {
  try {
    const branchId =
      req.query.branch_id && req.query.branch_id !== ""
        ? Number(req.query.branch_id)
        : null;

    const filter = buildFilters({ branchId }, "");

    const result = await pool.query(
      `
      SELECT
        DATE(created_at) AS day,
        COUNT(*) FILTER (WHERE approval_status='APPROVED') AS approved,
        COUNT(*) FILTER (WHERE approval_status='PENDING') AS pending,
        COUNT(*) FILTER (WHERE approval_status='REVERSED') AS reversed
      FROM discharge_headers
      WHERE deleted = false
      ${filter.conditions}
      GROUP BY DATE(created_at)
      ORDER BY day
      `,
      filter.params,
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Inventory Trends Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   AUDIT LOGS
====================================================== */
export const getAuditLogs = async (req, res) => {
  try {
    const branchId =
      req.query.branch_id && req.query.branch_id !== ""
        ? Number(req.query.branch_id)
        : null;

    const from = req.query.from || null;
    const to = req.query.to || null;

    const filter = buildFilters({ branchId, from, to }, "dh.");

    const result = await pool.query(
      `
      SELECT
        dh.discharge_no,
        dh.approval_status,
        dh.created_at,
        dh.approved_at,
        dh.reversed_at,
        b.branch_name,
        c.fullname
      FROM discharge_headers dh
      INNER JOIN branches b ON b.branch_id = dh.branch_id
      INNER JOIN customers c ON c.id = dh.customer_id
      WHERE dh.deleted = false
      ${filter.conditions}
      ORDER BY dh.created_at DESC
      LIMIT 200
      `,
      filter.params,
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Audit Logs Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   EXPORT EXCEL
====================================================== */
export const exportInventoryExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inventory Report");

    sheet.columns = [
      { header: "Discharge No", key: "discharge_no", width: 20 },
      { header: "Status", key: "approval_status", width: 15 },
      { header: "Branch", key: "branch_name", width: 20 },
      { header: "Customer", key: "fullname", width: 25 },
      { header: "Created At", key: "created_at", width: 20 },
    ];

    const data = await pool.query(
      `
      SELECT
        dh.discharge_no,
        dh.approval_status,
        b.branch_name,
        c.fullname,
        dh.created_at
      FROM discharge_headers dh
      INNER JOIN branches b ON b.branch_id = dh.branch_id
      INNER JOIN customers c ON c.id = dh.customer_id
      WHERE dh.deleted = false
      ORDER BY dh.created_at DESC
      `,
    );

    sheet.addRows(data.rows);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=inventory-report.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel Export Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   EXPORT PDF (PLACEHOLDER)
====================================================== */
export const exportInventoryPdf = async (req, res) => {
  try {
    const branchId =
      req.query.branch_id && req.query.branch_id !== ""
        ? Number(req.query.branch_id)
        : null;

    const from = req.query.from || null;
    const to = req.query.to || null;

    // =========================
    // FETCH DATA
    // =========================
    const metrics = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE approval_status='APPROVED') AS approved,
        COUNT(*) FILTER (WHERE approval_status='PENDING') AS pending,
        COUNT(*) FILTER (WHERE approval_status='REVERSED') AS reversed,
        COUNT(*) FILTER (WHERE approval_status='REJECTED') AS rejected
      FROM discharge_headers
      WHERE deleted = false
    `);

    const capacity = await pool.query(`
      SELECT
        p.product_name,
        COUNT(sh.storage_id) AS occupied
      FROM storage_headers sh
      JOIN products p ON p.product_id = sh.storage_space_product_id
      WHERE sh.deleted = false
      GROUP BY p.product_name
    `);

    const rows = await pool.query(`
      SELECT
        dh.discharge_no,
        dh.approval_status,
        b.branch_name,
        c.fullname,
        dh.created_at
      FROM discharge_headers dh
      JOIN branches b ON b.branch_id = dh.branch_id
      JOIN customers c ON c.id = dh.customer_id
      WHERE dh.deleted = false
      ORDER BY dh.created_at DESC
      LIMIT 100
    `);

    // =========================
    // INIT PDF
    // =========================
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=inventory-report.pdf",
    );

    doc.pipe(res);

    // =========================
    // HEADER
    // =========================
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Inventory Report", { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Generated on: ${new Date().toLocaleString()}`, {
        align: "center",
      });

    doc.moveDown();

    if (from || to) {
      doc.text(`Date Range: ${from || "Start"} - ${to || "Now"}`);
    }

    doc.moveDown();

    // =========================
    // SUMMARY BOX
    // =========================
    const summary = metrics.rows[0];

    doc.font("Helvetica-Bold").text("Summary", { underline: true });
    doc.moveDown(0.5);

    doc.font("Helvetica");

    doc.text(`Approved: ${summary.approved}`);
    doc.text(`Pending: ${summary.pending}`);
    doc.text(`Rejected: ${summary.rejected}`);
    doc.text(`Reversed: ${summary.reversed}`);

    doc.moveDown();

    // =========================
    // CAPACITY SECTION
    // =========================
    doc.font("Helvetica-Bold").text("Storage Usage", { underline: true });
    doc.moveDown(0.5);

    capacity.rows.forEach((c) => {
      doc.text(`${c.product_name}: ${c.occupied} used`);
    });

    doc.moveDown();

    // =========================
    // TABLE HEADER
    // =========================
    doc.font("Helvetica-Bold");

    doc.text("Discharge No", 40, doc.y);
    doc.text("Status", 140, doc.y);
    doc.text("Branch", 230, doc.y);
    doc.text("Customer", 330, doc.y);

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    doc.moveDown(0.5);
    doc.font("Helvetica");

    // =========================
    // TABLE ROWS
    // =========================
    rows.rows.forEach((row) => {
      const y = doc.y;

      doc.text(row.discharge_no, 40, y, { width: 90 });
      doc.text(row.approval_status, 140, y);
      doc.text(row.branch_name, 230, y);
      doc.text(row.fullname, 330, y);

      doc.moveDown();

      // PAGE BREAK
      if (doc.y > 750) {
        doc.addPage();
      }
    });

    // =========================
    // FOOTER
    // =========================
    doc.moveDown(2);
    doc.fontSize(9).text("Confidential - Internal Use Only", {
      align: "center",
    });

    doc.end();
  } catch (err) {
    console.error("PDF Export Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getStorageTrends = async (req, res) => {
  try {
    const branchId =
      req.query.branch_id && req.query.branch_id !== ""
        ? Number(req.query.branch_id)
        : null;

    const result = await pool.query(
      `
      SELECT
        DATE(created_at) AS day,
        COUNT(*) AS total_storages
      FROM storage_headers
      WHERE deleted = false
      ${branchId ? "AND branch_id = $1" : ""}
      GROUP BY DATE(created_at)
      ORDER BY day
      `,
      branchId ? [branchId] : [],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getStorageDistribution = async (req, res) => {
  try {
    const branchId =
      req.query.branch_id && req.query.branch_id !== ""
        ? Number(req.query.branch_id)
        : null;

    const result = await pool.query(
      `
      SELECT
        p.product_name AS storage_name,
        COUNT(sh.storage_id)::int AS count
      FROM storage_headers sh
      INNER JOIN products p
        ON p.product_id = sh.storage_space_product_id
      WHERE sh.deleted = false
      ${branchId ? "AND sh.branch_id = $1" : ""}
      GROUP BY p.product_name
      ORDER BY count DESC
      `,
      branchId ? [branchId] : [],
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBranchPerformance = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.branch_name AS branch,
        COUNT(sh.storage_id)::int AS total
      FROM storage_headers sh
      JOIN branches b ON b.branch_id = sh.branch_id
      WHERE sh.deleted = false
      GROUP BY b.branch_name
      ORDER BY total DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getStoragesByBranch = async (req, res) => {
  try {
    const { branch_id } = req.params;

    const result = await pool.query(
      `
      SELECT
        sh.storage_id,
        sh.storage_no,
        sh.created_at,
        p.product_name AS storage_name,
        COUNT(si.storage_item_id)::int AS items_count
      FROM storage_headers sh
      LEFT JOIN products p
        ON p.product_id = sh.storage_space_product_id
      LEFT JOIN storage_items si
        ON si.storage_id = sh.storage_id
      WHERE sh.branch_id = $1
        AND sh.deleted = false
      GROUP BY sh.storage_id, sh.storage_no, sh.created_at, p.product_name
      ORDER BY sh.created_at DESC
      `,
      [branch_id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getStorageItemsDetail = async (req, res) => {
  try {
    const { storage_id } = req.params;

    const result = await pool.query(
      `
      SELECT
        si.storage_item_id,
        p.product_name,
        si.quantity,
        si.remaining_quantity,
        si.condition,
        si.generated_barcode
      FROM storage_items si
      JOIN products p ON p.product_id = si.product_id
      WHERE si.storage_id = $1
      `,
      [storage_id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getStockValuation = async (req, res) => {
  try {
    const { branch_id } = req.query;

    const result = await pool.query(
      `
      SELECT
      b.branch_name,
      p.product_code,
      p.product_name,
      COALESCE(p.cost_price, 0) AS cost_price,
      COALESCE(pbb.stock_quantity, 0) AS quantity,
      COALESCE(pbb.stock_quantity, 0) * COALESCE(p.cost_price, 0) AS stock_value
      FROM products p
      JOIN products_by_branch pbb ON p.product_id = pbb.product_id
      JOIN branches b ON b.branch_id = pbb.branch_id
      WHERE p.deleted = false
        AND p.can_be_sold = true
        AND p.storage = false
        ${branch_id ? "AND b.branch_id = $1" : ""}
      GROUP BY b.branch_name, p.product_code, p.product_name, cost_price, quantity
      ORDER BY stock_value DESC
    `,
      branch_id ? [branch_id] : [],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getStockLevels = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.branch_name,
        p.product_name,
        COALESCE(p.minimum_quantity, 0) AS minimum_quantity,
        COALESCE(pbb.stock_quantity, 0) AS stock_quantity

      FROM products p

      INNER JOIN products_by_branch pbb
        ON p.product_id = pbb.product_id

      INNER JOIN branches b
        ON b.branch_id = pbb.branch_id

      WHERE p.deleted = false
        AND p.can_be_sold = true
        AND p.storage = false

      ORDER BY b.branch_name, p.product_name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getStockMovements = async (req, res) => {
  try {
    const { branch_id, product_id, from, to, page = 1, limit = 15 } = req.query;

    const params = [];
    let conditions = "";

    // =========================
    // FILTER: BRANCH
    // =========================
    if (branch_id) {
      params.push(branch_id);
      conditions += ` AND sm.branch_id = $${params.length}`;
    }

    // =========================
    // FILTER: PRODUCT
    // =========================
    if (product_id) {
      params.push(product_id);
      conditions += ` AND sm.product_id = $${params.length}`;
    }

    // =========================
    // FILTER: DATE FROM
    // =========================
    if (from) {
      params.push(from);
      conditions += ` AND DATE(sm.created_at) >= $${params.length}`;
    }

    // =========================
    // FILTER: DATE TO
    // =========================
    if (to) {
      params.push(to);
      conditions += ` AND DATE(sm.created_at) <= $${params.length}`;
    }

    // =========================
    // PAGINATION
    // =========================
    const offset = (Number(page) - 1) * Number(limit);

    params.push(limit);
    params.push(offset);

    // =========================
    // QUERY
    // =========================
    const result = await pool.query(
      `
      SELECT
        sm.movement_id,
        sm.created_at,
        b.branch_name,
        p.product_id,
        p.product_name,
        sm.movement_type,
        sm.quantity,
        sm.balance_after,
        sm.reference_table,
        sm.reference_id,

        ri.grn_no,
        st.transfer_no,
        ps.invoice_no,
        sh.storage_no,

        CASE
          WHEN sm.reference_table = 'receive_items'
            THEN ri.grn_no

          WHEN sm.reference_table = 'stock_transfers'
            THEN st.transfer_no

          WHEN sm.reference_table = 'pos_sales'
            THEN ps.invoice_no

          WHEN sm.reference_table = 'storage_headers'
            THEN sh.storage_no

          ELSE NULL
        END AS reference_no

      FROM stock_movements sm

      INNER JOIN products p
        ON p.product_id = sm.product_id

      INNER JOIN branches b
        ON b.branch_id = sm.branch_id

      LEFT JOIN receive_items ri
        ON sm.reference_table = 'receive_items'
        AND ri.receive_id = sm.reference_id

      LEFT JOIN stock_transfers st
        ON sm.reference_table = 'stock_transfers'
        AND st.transfer_id = sm.reference_id

      LEFT JOIN pos_sales ps
        ON sm.reference_table = 'pos_sales'
        AND ps.sale_id = sm.reference_id

      LEFT JOIN storage_headers sh
        ON sm.reference_table = 'storage_headers'
        AND sh.storage_id = sm.reference_id

      WHERE 1=1
      ${conditions}

      ORDER BY sm.created_at ASC

      LIMIT $${params.length - 1}
      OFFSET $${params.length}
      `,
      params,
    );

    // =========================
    // TOTAL COUNT
    // =========================
    const countParams = params.slice(0, params.length - 2);

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM stock_movements sm
      WHERE 1=1
      ${conditions}
      `,
      countParams,
    );

    res.json({
      data: result.rows,
      total: countResult.rows[0].total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(countResult.rows[0].total / Number(limit)),
    });
  } catch (err) {
    console.error("Stock Movements Error:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getInventoryAnalysis = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.product_name,
        SUM(si.quantity) AS total_qty,
        MAX(si.created_at) AS last_movement,
        CURRENT_DATE - MAX(si.created_at) AS aging_days
      FROM storage_items si
      JOIN products p ON p.product_id = si.product_id
      WHERE p.deleted = false
        AND p.can_be_sold = true
        AND p.storage = false
      GROUP BY p.product_name
      ORDER BY aging_days DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCustomerStorageReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.branch_name,
        p.product_name AS storage_name,
        sh.status,
        COUNT(*) AS total
      FROM storage_headers sh
      JOIN branches b ON b.branch_id = sh.branch_id
      JOIN products p ON p.product_id = sh.storage_space_product_id
      WHERE sh.deleted = false
      GROUP BY b.branch_name, p.product_name, sh.status
      ORDER BY total DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCustomerHistory = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.fullname,
        dh.discharge_no,
        dh.approval_status,
        dh.created_at,
        b.branch_name
      FROM discharge_headers dh
      JOIN customers c ON c.id = dh.customer_id
      JOIN branches b ON b.branch_id = dh.branch_id
      WHERE dh.deleted = false
      ORDER BY dh.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getActiveStorageReport = async (req, res) => {
  try {
    const {
      branch_id,
      customer_name,
      status,
      from,
      to,
      page = 1,
      limit = 15,
    } = req.query;

    const params = [];
    let conditions = `
      WHERE sh.deleted = false
    `;

    // =========================
    // BRANCH FILTER
    // =========================
    if (branch_id) {
      params.push(branch_id);
      conditions += ` AND sh.branch_id = $${params.length}`;
    }

    // =========================
    // CUSTOMER FILTER
    // =========================
    if (customer_name) {
      params.push(`%${customer_name}%`);
      conditions += `
        AND LOWER(c.fullname) LIKE LOWER($${params.length})
      `;
    }

    // =========================
    // STATUS
    // =========================
    if (status) {
      params.push(status);
      conditions += `
        AND sh.status = $${params.length}
      `;
    }

    // =========================
    // DATE FROM
    // =========================
    if (from) {
      params.push(from);
      conditions += `
        AND DATE(sh.created_at) >= $${params.length}
      `;
    }

    // =========================
    // DATE TO
    // =========================
    if (to) {
      params.push(to);
      conditions += `
        AND DATE(sh.created_at) <= $${params.length}
      `;
    }

    // =========================
    // PAGINATION
    // =========================
    const offset = (Number(page) - 1) * Number(limit);

    params.push(limit);
    params.push(offset);

    // =========================
    // QUERY
    // =========================
    const result = await pool.query(
      `
      SELECT
        sh.storage_id,
        sh.storage_no,
        sh.status,
        sh.received_date,
        sh.total_items,
        sh.storage_period_months,
        sh.current_visits,
        sh.max_monthly_visits,
        b.branch_name,
        c.fullname AS customer_name,
        p.product_name as storage_name,

        COUNT(si.storage_item_id)::int AS items_count

      FROM storage_headers sh

      INNER JOIN branches b
        ON b.branch_id = sh.branch_id

      INNER JOIN customers c
        ON c.id = sh.customer_id

      LEFT JOIN products p
        ON p.product_id = sh.storage_space_product_id

      LEFT JOIN storage_items si
        ON si.storage_id = sh.storage_id

      ${conditions}

      GROUP BY
        sh.storage_id,
        sh.storage_no,
        sh.status,
        sh.received_date,
        sh.total_items,
        sh.storage_period_months,
        sh.current_visits,
        sh.max_monthly_visits,
        b.branch_name,
        c.fullname,
        p.product_name

      ORDER BY sh.received_date DESC

      LIMIT $${params.length - 1}
      OFFSET $${params.length}
      `,
      params,
    );

    // =========================
    // TOTAL COUNT
    // =========================
    const countParams = params.slice(0, params.length - 2);

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total

      FROM storage_headers sh

      INNER JOIN customers c
        ON c.id = sh.customer_id

      ${conditions}
      `,
      countParams,
    );

    res.json({
      data: result.rows,
      total: countResult.rows[0].total,
      page: Number(page),
      totalPages: Math.ceil(countResult.rows[0].total / Number(limit)),
    });
  } catch (err) {
    console.error("ACTIVE STORAGE REPORT ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getStorageItems = async (req, res) => {
  try {
    const { storage_id } = req.params;

    const result = await pool.query(
      `
      SELECT
        si.storage_item_id,
        p.product_name,
        si.quantity,
        si.retrieved_quantity,
        si.remaining_quantity,
        si.condition,
        si.generated_barcode,
        si.item_notes

      FROM storage_items si

      INNER JOIN products p
        ON p.product_id = si.product_id

      WHERE si.storage_id = $1

      ORDER BY p.product_name
      `,
      [storage_id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("STORAGE ITEMS ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getStorageAnalytics = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.branch_name,

        COUNT(sh.storage_id) AS total_storages,

        COUNT(*) FILTER (
          WHERE sh.status = 'ACTIVE'
        ) AS active_storages,

        ROUND(
          (
            COUNT(*) FILTER (
              WHERE sh.status = 'ACTIVE'
            )::numeric
            /
            NULLIF(COUNT(sh.storage_id), 0)
          ) * 100,
          2
        ) AS occupancy_percent,

        AVG(
          CURRENT_DATE - sh.received_date
        ) AS avg_days_in_storage

      FROM storage_headers sh

      INNER JOIN branches b
        ON b.branch_id = sh.branch_id

      WHERE sh.deleted = false

      GROUP BY b.branch_name

      ORDER BY b.branch_name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getExpiringStorageContracts = async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT
          sh.storage_no,
          c.fullname,
          b.branch_name,
          sh.received_date,
          sh.storage_period_months,

          (
            sh.received_date
            +
            (sh.storage_period_months || ' month')::interval
          )::date AS expiry_date

        FROM storage_headers sh

        INNER JOIN customers c
          ON c.id = sh.customer_id

        INNER JOIN branches b
          ON b.branch_id = sh.branch_id

        WHERE sh.deleted = false
          AND sh.status = 'ACTIVE'

        ORDER BY expiry_date ASC
      `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getAllStorageItemsReport = async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT
          b.branch_name,
          sh.storage_no,
          c.fullname AS customer_name,

          sp.product_name AS storage_space,

          p.product_name AS item_name,

          si.remaining_quantity

        FROM storage_items si

        INNER JOIN storage_headers sh
          ON sh.storage_id = si.storage_id

        INNER JOIN customers c
          ON c.id = sh.customer_id

        INNER JOIN branches b
          ON b.branch_id = sh.branch_id

        LEFT JOIN products sp
          ON sp.product_id = sh.storage_space_product_id

        INNER JOIN products p
          ON p.product_id = si.product_id

        WHERE sh.deleted = false
          AND si.remaining_quantity > 0

        ORDER BY
          b.branch_name,
          sh.storage_no,
          p.product_name
      `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getStorageItemSummary = async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT
          b.branch_name,

          p.product_name,

          SUM(
            si.remaining_quantity
          )::numeric(14,2) AS quantity

        FROM storage_items si

        INNER JOIN storage_headers sh
          ON sh.storage_id = si.storage_id

        INNER JOIN branches b
          ON b.branch_id = sh.branch_id

        INNER JOIN products p
          ON p.product_id = si.product_id

        WHERE sh.deleted = false
          AND si.remaining_quantity > 0

        GROUP BY
          b.branch_name,
          p.product_name

        ORDER BY
          b.branch_name,
          p.product_name
      `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

/* ======================================================
   GET PENDING STORAGE VISIT REQUESTS
====================================================== */
export const getPendingStorageVisitRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          svr.visit_request_id,
          svr.request_no,
          svr.created_at,
          svr.visit_date,
          svr.storage_no,
          svr.customer_name,
          svr.telephone,
          svr.visitors_name,
          svr.visitors_telephone,
          svr.request_status,

          b.branch_name,

          c.email,

          sh.storage_space_product_id,

          p.product_name AS storage_space

        FROM storage_visit_requests svr

        LEFT JOIN branches b
          ON svr.branch_id = b.branch_id

        LEFT JOIN customers c
          ON svr.customer_id = c.id

        LEFT JOIN storage_headers sh
          ON svr.storage_id = sh.storage_id

        LEFT JOIN products p
          ON sh.storage_space_product_id =
             p.product_id

        WHERE svr.request_status = 'PENDING'

        ORDER BY svr.created_at DESC
      `,
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get visit requests error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ======================================================
   APPROVE STORAGE VISIT REQUEST
====================================================== */
export const approveStorageVisitRequest = async (req, res) => {
  try {
    const { id } = req.params;

    /* =====================================
         REQUEST DETAILS
      ===================================== */
    const requestResult = await pool.query(
      `
          SELECT
            svr.*,
            c.email,
            b.branch_name
          FROM storage_visit_requests svr
          LEFT JOIN customers c
            ON svr.customer_id = c.id
          LEFT JOIN branches b
            ON svr.branch_id = b.branch_id
          WHERE svr.visit_request_id = $1
        `,
      [id],
    );

    if (!requestResult.rows.length) {
      return res.status(404).json({
        message: "Visit request not found",
      });
    }

    const request = requestResult.rows[0];

    /* =====================================
         APPROVE REQUEST
      ===================================== */
    await pool.query(
      `
        UPDATE storage_visit_requests
        SET
          request_status = 'APPROVED',
          approved_by = $1,
          approved_at = NOW()
        WHERE visit_request_id = $2
      `,
      [req.user.id, id],
    );

    /* =====================================
         CREATE NOTIFICATION
      ===================================== */
    await pool.query(
      `
        INSERT INTO storage_notifications (
          customer_id,
          storage_id,
          visit_request_id,
          title,
          message,
          notification_type
        )
        VALUES (
          $1,$2,$3,$4,$5,$6
        )
      `,
      [
        request.customer_id,
        request.storage_id,
        request.visit_request_id,

        "Visit Request Approved",

        `Your request to visit storage unit ${request.storage_no} at the ${request.branch_name} branch on ${request.visit_date} is approved.`,

        "VISIT_APPROVED",
      ],
    );

    /*======================================
      SEND APPROVAL EMAIL
    ========================================*/
    if (request.email) {
      await sendEmail({
        to: request.email,

        subject: "Storage Visit Approved",

        html: `
      <div
        style="
          font-family: Arial, sans-serif;
          max-width: 700px;
          margin: auto;
          border: 1px solid #ddd;
          border-radius: 10px;
          overflow: hidden;
        "
      >

        <div
          style="
            background: #1a365d;
            color: white;
            padding: 20px;
          "
        >
          <h2>
            Storage Visit Approved
          </h2>
        </div>

        <div style="padding: 20px;">

          <p>
            Dear
            <strong>
              ${request.customer_name}
            </strong>,
          </p>

          <p>
            Your request to visit
            storage unit
            <strong>
              ${request.storage_no}
            </strong>
            has been approved.
          </p>

          <table
            width="100%"
            cellpadding="10"
            style="
              border-collapse: collapse;
              margin-top: 20px;
            "
          >

            <tr>
              <td>
                <strong>
                  Branch
                </strong>
              </td>

              <td>
                ${request.branch_name}
              </td>
            </tr>

            <tr>
              <td>
                <strong>
                  Visit Date
                </strong>
              </td>

              <td>
                ${request.visit_date}
              </td>
            </tr>

            <tr>
              <td>
                <strong>
                  Visitor
                </strong>
              </td>

              <td>
                ${request.visitors_name}
              </td>
            </tr>

          </table>

          <div
            style="
              text-align: center;
              margin-top: 30px;
            "
          >
            <img
              src="${request.qr_pass_image}"
              width="220"
            />
          </div>

          <p style="margin-top: 30px;">
            Present this QR code
            during your visit.
          </p>

        </div>

      </div>
    `,
      });
    }

    /* =====================================
         ACTIVITY LOG
      ===================================== */
    await logActivity({
      userId: req.user.id,
      userName: req.user.fullname,
      branchId: req.user.branchId,
      module: "STORAGE_VISITS",
      action: "APPROVE",
      description: `Approved storage visit request ${request.request_no}`,
      ipAddress: req.ip,
    });

    res.json({
      message: "Visit request approved",
    });
  } catch (err) {
    console.error("Approve visit error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ======================================================
   REJECT STORAGE VISIT REQUEST
====================================================== */
export const rejectStorageVisitRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({
        message: "Rejection reason required",
      });
    }

    /* =====================================
         REQUEST DETAILS
      ===================================== */
    const requestResult = await pool.query(
      `
          SELECT
            svr.*,
            c.email,
            b.branch_name

          FROM storage_visit_requests svr

          LEFT JOIN customers c
            ON svr.customer_id = c.id

          LEFT JOIN branches b
            ON svr.branch_id = b.branch_id

          WHERE svr.visit_request_id = $1
        `,
      [id],
    );

    if (!requestResult.rows.length) {
      return res.status(404).json({
        message: "Visit request not found",
      });
    }

    const request = requestResult.rows[0];

    /* =====================================
         UPDATE REQUEST
      ===================================== */
    await pool.query(
      `
        UPDATE storage_visit_requests
        SET
          request_status = 'REJECTED',
          rejection_reason = $1,
          rejected_by = $2,
          rejected_at = NOW()
        WHERE visit_request_id = $3
      `,
      [rejection_reason, req.user.id, id],
    );

    /* =====================================
         CREATE NOTIFICATION
      ===================================== */
    await pool.query(
      `
        INSERT INTO storage_notifications (
          customer_id,
          storage_id,
          visit_request_id,
          title,
          message,
          notification_type
        )
        VALUES (
          $1,$2,$3,$4,$5,$6
        )
      `,
      [
        request.customer_id,
        request.storage_id,
        request.visit_request_id,

        "Visit Request Rejected",

        `Your request to visit storage unit ${request.storage_no} at the ${request.branch_name} branch on ${request.visit_date} is rejected.`,

        "VISIT_REJECTED",
      ],
    );

    /* =====================================
         EMAIL
      ===================================== */
    if (request.email) {
      await sendEmail({
        to: request.email,

        subject: "Storage Visit Rejected",

        html: `
            <h2>
              Storage Visit Rejected
            </h2>

            <p>
              Your request to visit
              storage unit
              <strong>
                ${request.storage_no}
              </strong>
              at the
              <strong>
                ${request.branch_name}
              </strong>
              branch on
              <strong>
                ${request.visit_date}
              </strong>
              has been rejected.
            </p>

            <p>
              <strong>
                Reason:
              </strong>
              ${rejection_reason}
            </p>
          `,
      });
    }

    /* =====================================
         ACTIVITY LOG
      ===================================== */
    await logActivity({
      userId: req.user.id,
      userName: req.user.fullname,
      branchId: req.user.branchId,
      module: "STORAGE_VISITS",
      action: "REJECT",
      description: `Rejected storage visit request ${request.request_no}`,
      ipAddress: req.ip,
    });

    res.json({
      message: "Visit request rejected",
    });
  } catch (err) {
    console.error("Reject visit error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ======================================================
   PROCESS STORAGE VISIT CHECK-IN
====================================================== */
export const processStorageVisitCheckin = async (req, res) => {
  try {
    const { qr_pass_code } = req.body;

    if (!qr_pass_code) {
      return res.status(400).json({
        message: "QR pass required",
      });
    }

    /* =====================================
         FIND REQUEST
      ===================================== */
    const requestResult = await pool.query(
      `
          SELECT *
          FROM storage_visit_requests
          WHERE qr_pass_code = $1
            AND request_status = 'APPROVED'
        `,
      [qr_pass_code],
    );

    if (!requestResult.rows.length) {
      return res.status(404).json({
        message: "Invalid QR pass",
      });
    }

    const request = requestResult.rows[0];

    /* =====================================
         CREATE VISIT LOG
      ===================================== */
    const visitLog = await pool.query(
      `
          INSERT INTO storage_visit_logs (
            visit_request_id,
            storage_id,
            customer_id,
            scanned_qr_code,
            receiving_officer
          )
          VALUES (
            $1,$2,$3,$4,$5
          )
          RETURNING *
        `,
      [
        request.visit_request_id,
        request.storage_id,
        request.customer_id,
        qr_pass_code,
        req.user.id,
      ],
    );

    /* =====================================
         COMPLETE REQUEST
      ===================================== */
    await pool.query(
      `
        UPDATE storage_visit_requests
        SET
          request_status = 'COMPLETED',
          completed_by = $1,
          completed_at = NOW()
        WHERE visit_request_id = $2
      `,
      [req.user.id, request.visit_request_id],
    );

    /* =====================================
         UPDATE VISITS
      ===================================== */
    await pool.query(
      `
        UPDATE storage_headers
        SET
          current_visits =
            current_visits + 1
        WHERE storage_id = $1
      `,
      [request.storage_id],
    );

    /* =====================================
         COMPLETE NOTIFICATIONS
      ===================================== */
    await pool.query(
      `
        UPDATE storage_notifications
        SET
          is_completed = TRUE
        WHERE visit_request_id = $1
      `,
      [request.visit_request_id],
    );

    res.json({
      message: "Visit check-in successful",

      visitLog: visitLog.rows[0],
    });
  } catch (err) {
    console.error("Visit check-in error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const searchCustomers = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    console.log("CUSTOMER SEARCH:", search);

    // =========================
    // EMPTY SEARCH
    // =========================
    if (!search || search.length < 2) {
      return res.json([]);
    }

    // =========================
    // QUERY
    // =========================
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.fullname,
        c.email,
        c.telephone,
        b.branch_name

      FROM customers c

      LEFT JOIN branches b
        ON b.branch_id = c.createdatbranchid

      WHERE
        (
          LOWER(c.fullname) LIKE LOWER($1)
          OR LOWER(c.email) LIKE LOWER($1)
          OR LOWER(c.telephone) LIKE LOWER($1)
        )

      ORDER BY c.fullname ASC

      LIMIT 20
      `,
      [`%${search}%`],
    );

    console.log("CUSTOMER RESULTS:", result.rows);

    res.json(result.rows);
  } catch (err) {
    console.error("CUSTOMER SEARCH ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getExpiredStorages = async (req, res) => {
  try {
    const { customer_id } = req.query;

    // =========================
    // REQUIRE CUSTOMER
    // =========================
    if (!customer_id) {
      return res.json([]);
    }

    const result = await pool.query(
      `
      SELECT
        sh.storage_id,
        sh.storage_no,
        sh.received_date,
        sh.discharge_date,
        sh.customer_id,

        c.fullname,
        c.email,
        c.telephone,

        b.branch_name,

        p.product_name AS storage_space

      FROM storage_headers sh

      INNER JOIN customers c
        ON c.id = sh.customer_id

      INNER JOIN branches b
        ON b.branch_id = sh.branch_id

      LEFT JOIN products p
        ON p.product_id = sh.storage_space_product_id

      WHERE sh.deleted = false
        AND sh.customer_id = $1
        AND sh.discharge_date < CURRENT_DATE

      ORDER BY sh.discharge_date ASC
      `,
      [customer_id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const extendStorageContract = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { storage_id, months_extension, new_discharge_date } = req.body;

    // =========================================
    // VALIDATION
    // =========================================
    if (!storage_id) {
      return res.status(400).json({
        message: "Storage ID is required",
      });
    }

    if (!months_extension || Number(months_extension) <= 0) {
      return res.status(400).json({
        message: "Months extension is required",
      });
    }

    if (!new_discharge_date) {
      return res.status(400).json({
        message: "New discharge date is required",
      });
    }

    // =========================================
    // GET STORAGE DETAILS
    // =========================================
    const storageResult = await client.query(
      `
      SELECT
        sh.*,
        c.fullname,
        c.email,
        c.telephone,
        b.branch_name
      FROM storage_headers sh
      LEFT JOIN customers c
        ON c.id = sh.customer_id
      LEFT JOIN branches b
        ON b.branch_id = sh.branch_id
      WHERE sh.storage_id = $1
        AND sh.deleted = false
      LIMIT 1
      `,
      [storage_id],
    );

    if (storageResult.rows.length === 0) {
      return res.status(404).json({
        message: "Storage not found",
      });
    }

    const storage = storageResult.rows[0];

    // =========================================
    // INSERT EXTENSION HISTORY
    // =========================================
    await client.query(
      `
      INSERT INTO storage_extensions (
        storage_id,
        customer_id,
        old_discharge_date,
        months_extended,
        new_discharge_date,
        extended_by,
        created_at,
        deleted
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        NOW(),
        false
      )
      `,
      [
        storage.storage_id,
        storage.customer_id,
        storage.discharge_date,
        Number(months_extension),
        new_discharge_date,
        req.user?.id || null,
      ],
    );

    // =========================================
    // UPDATE STORAGE HEADER
    // =========================================
    await client.query(
      `
      UPDATE storage_headers
      SET
        discharge_date = $1,
        extension_count = COALESCE(extension_count, 0) + 1,
        last_extended_at = NOW(),
        last_extended_by = $2
      WHERE storage_id = $3
      `,
      [new_discharge_date, req.user?.id || null, storage.storage_id],
    );

    // =========================================
    // CUSTOMER NOTIFICATION
    // =========================================
    await client.query(
      `
      INSERT INTO storage_notifications (
      customer_id,
      storage_id,
      title,
      message,
      notification_type
      )
      VALUES (
      $1,
      $2,
      $3,
      $4,
      $5
      )
      `,
      [
        storage.customer_id,
        storage.storage_id,
        "Storage Extension Approved",
        `Your storage ${storage.storage_no} has been extended successfully from ${new Date(
          storage.discharge_date,
        ).toLocaleDateString()} to ${new Date(
          new_discharge_date,
        ).toLocaleDateString()}.`,

        "STORAGE_EXTENSION",
      ],
    );

    // =========================================
    // SEND EMAIL
    // =========================================
    if (storage.email) {
      await sendEmail({
        to: storage.email,

        subject: "Storage Extension Confirmation",

        html: `
          <div style="font-family: Arial, sans-serif;">

            <h2>Storage Extension Successful</h2>

            <p>
              Dear ${storage.fullname || "Customer"},
            </p>

            <p>
              Your storage contract has been extended successfully.
            </p>

            <table
              cellpadding="8"
              cellspacing="0"
              border="1"
              style="border-collapse: collapse;"
            >
              <tr>
                <td><strong>Storage No</strong></td>
                <td>${storage.storage_no}</td>
              </tr>

              <tr>
                <td><strong>Branch</strong></td>
                <td>${storage.branch_name}</td>
              </tr>

              <tr>
                <td><strong>Old Expiry Date</strong></td>
                <td>
                  ${new Date(storage.discharge_date).toLocaleDateString()}
                </td>
              </tr>

              <tr>
                <td><strong>New Expiry Date</strong></td>
                <td>
                  ${new Date(new_discharge_date).toLocaleDateString()}
                </td>
              </tr>

              <tr>
                <td><strong>Months Extended</strong></td>
                <td>${months_extension}</td>
              </tr>
            </table>

            <br />

            <p>
              Thank you for using our storage services.
            </p>

          </div>
        `,
      });
    }

    // =========================================
    // ACTIVITY LOG
    // =========================================
    await logActivity({
      userId: req.user?.id || null,
      userName: req.user?.fullname || req.user?.name || null,
      branchId: storage.branch_id || null,
      module: "STORAGE EXTENSION",
      action: "EXTEND",
      description: `Extended storage ${storage.storage_no} by ${months_extension} month(s)`,
      ipAddress: req.ip,
    });

    await client.query("COMMIT");

    res.json({
      message: "Storage extended successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("STORAGE EXTENSION ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  } finally {
    client.release();
  }
};

export const getCustomerNotifications = async (req, res) => {
  try {
    const customerId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        notification_id,
        title,
        message,
        notification_type,
        is_read,
        created_at

      FROM customer_notifications

      WHERE customer_id = $1
        AND deleted = false

      ORDER BY created_at DESC
      `,
      [customerId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};
