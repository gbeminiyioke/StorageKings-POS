import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.js";
import {
  createReceiveItems,
  listReceiveItems,
  getReceiveById,
  deleteReceive,
  reverseReceive,
  printReceive,
  sendGRNEmail,
  updateReceive,
} from "../controllers/receive.controller.js";
import { generateGRNPDF } from "../services/pdf.service.js";
import { exportGRNExcel } from "../services/excel.service.js";

const router = express.Router();

router.post(
  "/create",
  authenticate,
  authorize("can_create"),
  createReceiveItems,
);

router.get("/list", authenticate, authorize("can_view"), listReceiveItems);

router.get("/:id", authenticate, authorize("can_view"), getReceiveById);

router.get("/:id/print", authenticate, authorize("can_view"), printReceive);

router.get("/:id/printpdf", async (req, res) => {
  await generateGRNPDF(req.params.id, res);
});

router.get(
  "/:id/excel",
  authenticate,
  authorize("can_view"),
  async (req, res) => {
    await exportGRNExcel(req.params.id, res);
  },
);

router.delete("/:id", authenticate, authorize("can_delete"), deleteReceive);

router.post(
  "/:id/reverse",
  authenticate,
  authorize("can_edit"),
  reverseReceive,
);

router.post("/:id/send-email", sendGRNEmail);

router.put("/:id", authenticate, authorize("can_edit"), updateReceive);

export default router;
