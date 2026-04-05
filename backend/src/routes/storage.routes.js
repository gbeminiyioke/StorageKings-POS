import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import { authorize } from "../middleware/authorize.js";
import {
  searchStorageCustomers,
  getUserBranches,
  getStorageSpaces,
  searchStorageProducts,
  getStorageProductByBarcode,
  getNextStorageNo,
  createStorage,
  getRecentStorages,
  emailStoragePdf,
  downloadStoragePdf,
  getStorageItems,
} from "../controllers/storage.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(sessionTimeout);

router.get("/customers", searchStorageCustomers);
router.get("/branches", getUserBranches);
router.get("/spaces", getStorageSpaces);
router.get("/products/search", searchStorageProducts);
router.get("/products/barcode/:product_code", getStorageProductByBarcode);
router.get("/next-number/:branch_id", getNextStorageNo);
router.get("/recent", getRecentStorages);
router.post("/", authorize("can_create"), createStorage);
router.post("/:storage_id/email", authorize("can_view"), emailStoragePdf);
router.get("/:storage_id/pdf", authorize("can_view"), downloadStoragePdf);
router.get("/:storage_id/items", authorize("can_view"), getStorageItems);

export default router;
