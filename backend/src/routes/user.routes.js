import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserBranches,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", authenticate, sessionTimeout, authorize("can_view"), getUsers);

router.get(
  "/:id/branches",
  authenticate,
  sessionTimeout,
  authorize("can_view"),
  getUserBranches,
);

router.post(
  "/",
  authenticate,
  sessionTimeout,
  authorize("can_create"),
  createUser,
);

router.put(
  "/:id",
  authenticate,
  sessionTimeout,
  authorize("can_edit"),
  updateUser,
);

router.delete(
  "/:id",
  authenticate,
  sessionTimeout,
  authorize("can_delete"),
  deleteUser,
);

export default router;
