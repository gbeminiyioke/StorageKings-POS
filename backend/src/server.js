import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import "./config/env.js";
import app from "./app.js";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { runMonthlyStorageReset } from "./jobs/monthlyReset.job.js";
import { cleanupSessions } from "./jobs/sessionCleanup.js";
import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.routes.js";
import branchRoutes from "./routes/branch.routes.js";
import roleRoutes from "./routes/role.routes.js";
import userRoutes from "./routes/user.routes.js";
import securityRoutes from "./routes/security.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import productRoutes from "./routes/product.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import receiveItemRoutes from "./routes/receive.routes.js";
import purchasesReportRoutes from "./routes/purchasesReport.routes.js";
import posRoutes from "./routes/pos.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import storageRoutes from "./routes/storage.routes.js";
import dischargeRoutes from "./routes/discharge.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import posDashboardRoutes from "./routes/posDashboard.routes.js";
import customerKycRoutes from "./routes/customerKyc.routes.js";
import { recoverAbandonedOnboardings } from "./jobs/onboardingRecovery.job.js";

//const app = express();

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

////app.use(cors());
//app.use(express.json({ limit: "10mb" }));
//app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ======================================================
   STATIC FILES (UPLOADS)
====================================================== */
////app.use("/uploads", express.static(path.resolve("uploads")));
//app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
/*---------------------------------
  TEMPORARY LOGGER
-----------------------------------*/
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

/* ======================================================
   PRODUCTION HEALTH CHECK
====================================================== */

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      ok: true,
      status: "healthy",
      database: "connected",
    });
  } catch (error) {
    console.error("Production health check failed");

    return res.status(503).json({
      ok: false,
      status: "unhealthy",
    });
  }
});

/*---------------------------------
  ROUTES
-----------------------------------*/
app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/products", productRoutes);
//app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/suppliers", supplierRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/receive-items", receiveItemRoutes);
app.use("/api/reports", purchasesReportRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/discharge", dischargeRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/pos-dashboard", posDashboardRoutes);
app.use("/api/customer-kyc", customerKycRoutes);

/* ======================================================
   REACT STATIC FILES
====================================================== */

app.use(express.static(path.join(__dirname, "../public")));

/* ======================================================
   REACT ROUTER FALLBACK (Express 5)
====================================================== */

app.use((req, res, next) => {
  // Let API routes continue to return normal 404s
  if (req.path.startsWith("/api")) {
    return next();
  }

  // Ignore uploaded files
  if (req.path.startsWith("/uploads")) {
    return next();
  }

  res.sendFile(path.join(__dirname, "../public/index.html"));
});

//Run at midnight on 1st of every month
cron.schedule("0 0 1 * *", runMonthlyStorageReset);
cron.schedule("0 2 * * *", cleanupSessions);

/*===========================================
SYSTEM AUTO-RECOVERS ABANDONED WORK
EVERY 10 MINUTES
=============================================*/
setInterval(recoverAbandonedOnboardings, 15 * 60 * 1000);

/*---------------------------------
  SERVER START
-----------------------------------*/
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

//console.log("JWT SECRET:", process.env.JWT_SECRET);
