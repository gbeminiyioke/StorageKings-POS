import express from "express";
import { getPurchasesReport } from "../controllers/purchasesReport.controller.js";

const router = express.Router();

/*
GET
/api/reports/purchases
*/

router.get("/purchases", getPurchasesReport);

export default router;
