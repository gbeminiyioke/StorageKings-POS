import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { getDashboardCounts } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/counts", authenticate, getDashboardCounts);

export default router;
