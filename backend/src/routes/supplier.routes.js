import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
  getSupplierBalance,
} from "../controllers/supplier.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(sessionTimeout);

router.post("/", authorize("can_create"), createSupplier);
router.get("/", authorize("can_view"), getSuppliers);
router.get("/:id/balance", getSupplierBalance);
router.put("/:id", authorize("can_edit"), updateSupplier);
router.delete("/:id", authorize("can_delete"), deleteSupplier);

export default router;
