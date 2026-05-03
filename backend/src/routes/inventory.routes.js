import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getInventoryMetrics,
  getInventoryTrends,
  getAuditLogs,
  exportInventoryExcel,
  exportInventoryPdf,
  getStorageTrends,
  getStorageDistribution,
  getBranchPerformance,
  getStoragesByBranch,
  getStorageItemsDetail,
} from "../controllers/inventory.controller.js";

const router = express.Router();

router.use(authenticate);

router.get("/metrics", getInventoryMetrics);
router.get("/trends", getInventoryTrends);
router.get("/audit", getAuditLogs);

router.get("/storage-trends", getStorageTrends);
router.get("/storage-distribution", getStorageDistribution);

router.get("/branch-performance", getBranchPerformance);

router.get("/branch/:branch_id/storages", getStoragesByBranch);
router.get("/storage/:storage_id/items", getStorageItemsDetail);

router.get("/export/excel", exportInventoryExcel);
router.get("/export/pdf", exportInventoryPdf);

export default router;
