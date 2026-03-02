import express from "express";
import {
  getAuthLogs,
  getActiveSessions,
  killSession,
  getSecurityStats,
} from "../controllers/security.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

//ALL ROUTES PROTECTED

router.get(
  "/logs",
  authenticate,
  sessionTimeout,
  authorize("can_vew_security"),
  getAuthLogs,
);
router.get(
  "/sessions",
  authenticate,
  sessionTimeout,
  authorize("can_vew_security"),
  getActiveSessions,
);
router.get(
  "/sessions/:id/kill",
  authenticate,
  sessionTimeout,
  authorize("can_vew_security"),
  killSession,
);
router.get(
  "/stats",
  authenticate,
  sessionTimeout,
  authorize("can_view_security"),
  getSecurityStats,
);

export default router;
