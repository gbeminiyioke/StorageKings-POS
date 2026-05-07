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
  getStockValuation,
  getStockLevels,
  getStockMovements,
  getInventoryAnalysis,
  getCustomerHistory,
  getActiveStorageReport,
  getStorageItems,
  getStorageAnalytics,
  getExpiringStorageContracts,
  getAllStorageItemsReport,
  getStorageItemSummary,
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

router.get("/reports/valuation", getStockValuation);
router.get("/reports/levels", getStockLevels);
router.get("/reports/movements", getStockMovements);
router.get("/reports/analysis", getInventoryAnalysis);

router.get("/reports/customer-storage", getActiveStorageReport);
router.get("/reports/customer-storage/:storage_id/items", getStorageItems);

router.get("/reports/customer-history", getCustomerHistory);

router.get("/reports/storage-analytics", getStorageAnalytics);

router.get("/reports/expiring-storage", getExpiringStorageContracts);

router.get("/reports/all-storage-items", getAllStorageItemsReport);

router.get("/reports/storage-item-summary", getStorageItemSummary);

router.get("/export/excel", exportInventoryExcel);
router.get("/export/pdf", exportInventoryPdf);

export default router;
