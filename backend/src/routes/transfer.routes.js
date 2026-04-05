import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import activityMiddleware from "../middleware/activityMiddleware.js";
import {
  getTransferBranches,
  getNextTransferNo,
  searchTransferProducts,
  getTransferProductByBarcode,
  createTransfer,
  getRecentTransfers,
} from "../controllers/transfer.controller.js";

const router = express.Router();

router.get("/branches", authenticate, getTransferBranches);
router.get("/next-number/:branch_id", authenticate, getNextTransferNo);
router.get("/search-products", authenticate, searchTransferProducts);
router.get("/barcode/:product_code", authenticate, getTransferProductByBarcode);
router.get("/recent", authenticate, getRecentTransfers);

router.post(
  "/",
  authenticate,
  sessionTimeout,
  activityMiddleware(
    "Stock Transfer",
    "Post",
    (req) =>
      `Posted stock transfer from branch ${req.body.from_branch_id} to ${req.body.to_branch_id}`,
  )(createTransfer),
);

export default router;
