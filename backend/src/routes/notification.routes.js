import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  markAsRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", authenticate, getNotifications);
router.put("/:id", authenticate, markAsRead);

export default router;
