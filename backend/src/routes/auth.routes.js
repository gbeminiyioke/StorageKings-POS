import express from "express";
import {
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  getActiveSessions,
  kickSession,
  getAllActiveSessions,
  adminKickSession,
  getSessionStatistics,
  refresh,
  ping,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

/*=====================================
  AUTH
=======================================*/
router.post("/", login);
router.post("/login", login);
router.post("/logout", authenticate, logout);

/*=====================================
  PASSWORD RESET
=======================================*/
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

/*=====================================
  SESSION MANAGEMENT
=======================================*/
router.get("/active-sessions", authenticate, getActiveSessions);
router.post("/kick-session", authenticate, kickSession);

router.get("/admin/sessions", authenticate, getAllActiveSessions);
//router.post("/admin/kick-session", authenticate, adminKickSession);
router.post("/admin/sessions/terminate", authenticate, adminKickSession);
router.get("/admin/sessions/stats", authenticate, getSessionStatistics);

router.post("/refresh", refresh);
router.post("/ping", authenticate, ping);

export default router;
