import pool from "../config/db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

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
