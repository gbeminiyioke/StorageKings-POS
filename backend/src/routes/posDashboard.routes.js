import express from "express";
import { getPOSDashboard } from "../controllers/posDashboard.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticate, getPOSDashboard);

export default router;
