import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import { authorize } from "../middleware/authorize.js";
import {
  searchDischargeCustomers,
  getDischargeBranches,
  getNextDischargeNo,
  getCustomerStorages,
  getStorageItemsForDischarge,
  createDischarge,
  getRecentDischarges,
  downloadDischargePdf,
  emailDischargePdf,
  scanDischargeItem,
  reverseDischarge,
  approveDischarge,
  rejectDischarge,
} from "../controllers/discharge.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(sessionTimeout);

router.get("/customers", searchDischargeCustomers);
router.get("/branches", getDischargeBranches);
router.get("/next-number/:branch_id", getNextDischargeNo);
router.get("/storage-nos", getCustomerStorages);
router.get("/storage/:storage_id/items", getStorageItemsForDischarge);
router.get("/recent", getRecentDischarges);

router.post("/", authorize("can_create"), createDischarge);
router.post("/scan-item", scanDischargeItem);
router.get("/:discharge_id/pdf", authorize("can_view"), downloadDischargePdf);

router.post(
  "/:discharge_id/approve",
  authorize("can_approve"),
  approveDischarge,
);
router.post("/:discharge_id/reject", authorize("can_approve"), rejectDischarge);

router.post(
  "/:discharge_id/reverse",
  authorize("can_delete"),
  reverseDischarge,
);

router.post("/:discharge_id/email", authorize("can_view"), emailDischargePdf);

export default router;
