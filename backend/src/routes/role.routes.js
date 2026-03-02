import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/role.controller.js";

const router = express.Router();

router.get("/", authenticate, sessionTimeout, authorize("can_view"), getRoles);

router.post(
  "/",
  authenticate,
  sessionTimeout,
  authorize("can_create"),
  createRole,
);

router.put(
  "/:role_id",
  authenticate,
  sessionTimeout,
  authorize("can_edit"),
  updateRole,
);

router.delete(
  "/:role_id",
  authenticate,
  sessionTimeout,
  authorize("can_delete"),
  deleteRole,
);

export default router;
