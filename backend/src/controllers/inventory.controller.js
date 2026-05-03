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
