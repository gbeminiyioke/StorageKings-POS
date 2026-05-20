import express from "express";
import {
  generateDocumentNumber,
  completeSale,
  getSaleInvoice,
  downloadSaleInvoicePdf,
} from "../controllers/pos.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/generate-number/:type", authenticate, generateDocumentNumber);
router.get("/invoice/:sale_id", authenticate, getSaleInvoice);
router.get("/invoice-pdf/:sale_id", authenticate, downloadSaleInvoicePdf);
router.post("/complete-sale", authenticate, completeSale);

export default router;
