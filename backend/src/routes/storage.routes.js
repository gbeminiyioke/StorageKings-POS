import express from "express";
import {
  searchStorageCustomers,
  getUserBranches,
  getStorageSpaces,
  searchStorageProducts,
  getStorageProductByBarcode,
  getNextStorageNo,
  createStorage,
  getRecentStorages,
  getStorageItems,
  getStorageDetails,
  confirmStorageBarcode,
  getStoragePdf,
  emailStoragePdf,
  processStorageVisitCheckin,
  processStorageVisitCheckout,
  getActiveStorageVisits,
  getStorageVisitHistory,
  getOnboardingQueue,
  startOnboarding,
  completeOnboarding,
  cancelOnboarding,
  getCurrentOnboarding,
} from "../controllers/storage.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import { storageUpload } from "../middleware/storageUpload.middleware.js";

const router = express.Router();

/* ======================================================
   PUBLIC ROUTES
====================================================== */

/*
 * PDF is opened in a new browser tab.
 * Authentication is handled by the token parameter.
 */
router.get("/:storage_id/pdf", getStoragePdf);

/* ======================================================
   PROTECTED ROUTES
====================================================== */

router.use(authenticate);
router.use(sessionTimeout);

/* ======================================================
   LOOKUP ROUTES
====================================================== */

router.get("/customers", authorize("can_view"), searchStorageCustomers);
router.get("/branches", authorize("can_view"), getUserBranches);
router.get("/spaces", authorize("can_view"), getStorageSpaces);
router.get("/products/search", authorize("can_view"), searchStorageProducts);

router.get(
  "/products/barcode/:product_code",
  authorize("can_view"),
  getStorageProductByBarcode,
);

router.get("/next-number/:branch_id", authorize("can_view"), getNextStorageNo);

/* ======================================================
   STORAGE VISITS
====================================================== */

router.post("/visits/checkin", processStorageVisitCheckin);
router.put("/visits/:id/checkout", processStorageVisitCheckout);
router.get("/visits/active", getActiveStorageVisits);
router.get("/visits/history", getStorageVisitHistory);

/* ======================================================
   STORAGE WORKFLOW
====================================================== */
router.get("/onboarding/current", getCurrentOnboarding);
router.get("/onboarding-queue", authorize("can_view"), getOnboardingQueue);

router.post(
  "/onboarding/:onboardingId/start",
  authorize("can_edit"),
  startOnboarding,
);

router.post(
  "/onboarding/:onboardingId/cancel",
  authorize("can_edit"),
  cancelOnboarding,
);

router.post(
  "/onboarding/:onboardingId/complete",
  authorize("can_edit"),
  completeOnboarding,
);

/* ======================================================
   STORAGE TRANSACTIONS
====================================================== */

router.post(
  "/",
  authorize("can_create"),
  storageUpload.single("attachment"),
  createStorage,
);

router.get("/recent", authorize("can_view"), getRecentStorages);

/* ======================================================
   STORAGE ACTIONS
====================================================== */

router.post(
  "/:storage_id/confirm-barcode",
  authorize("can_edit"),
  confirmStorageBarcode,
);

router.post("/:storage_id/email", authorize("can_view"), emailStoragePdf);

/* ======================================================
   STORAGE DETAIL ROUTES
   ALWAYS KEEP PARAMETER ROUTES LAST
====================================================== */

router.get("/:storage_id/items", authorize("can_view"), getStorageItems);

router.get("/:storage_id", authorize("can_view"), getStorageDetails);

export default router;
