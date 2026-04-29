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
} from "../controllers/storage.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import { storageUpload } from "../middleware/storageUpload.middleware.js";

const router = express.Router();

/* ======================================================
   PUBLIC TOKEN PDF ROUTE
   This must come BEFORE authenticate middleware because
   the PDF is opened in a new browser tab.
====================================================== */
router.get("/:storage_id/pdf", getStoragePdf);

/* ======================================================
   ALL OTHER ROUTES REQUIRE LOGIN
====================================================== */
router.use(authenticate);
router.use(sessionTimeout);

/* ======================================================
   CUSTOMER / BRANCH / PRODUCT LOOKUPS
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
   STORAGE TRANSACTIONS
====================================================== */
//router.post("/", authorize("can_create"), createStorage);
router.post(
  "/",
  authorize("can_create"),
  storageUpload.single("attachment"),
  createStorage,
);

router.get("/recent", authorize("can_view"), getRecentStorages);

router.get("/:storage_id", authorize("can_view"), getStorageDetails);

router.get("/:storage_id/items", authorize("can_view"), getStorageItems);

router.post(
  "/:storage_id/confirm-barcode",
  authorize("can_edit"),
  confirmStorageBarcode,
);

/* ======================================================
   PDF / EMAIL
====================================================== */
router.post("/:storage_id/email", authorize("can_view"), emailStoragePdf);

export default router;
