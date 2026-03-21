import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import { authorize } from "../middleware/authorize.js";
import activityMiddleware from "../middleware/activityMiddleware.js";
import {
  getBranches,
  getEnabledBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getNextGRN,
} from "../controllers/branches.controller.js";

const router = express.Router();

router.get("/public/enabled", getEnabledBranches);
router.get("/", authenticate, getBranches);
router.get("/:branch_id/next-grn", authenticate, getNextGRN);
router.post(
  "/",
  authenticate,
  sessionTimeout,
  authorize("can_create"),
  activityMiddleware(
    "Branches",
    "Create",
    (req) => `Created branch: ${req.body.branch_name}`,
  )(createBranch),
);

router.put(
  "/:id",
  authenticate,
  sessionTimeout,
  authorize("can_edit"),
  activityMiddleware(
    "Branches",
    "Update",
    (req) => `Updated branch: ${req.body.branch_name}`,
  )(updateBranch),
);

router.delete(
  "/:id",
  authenticate,
  sessionTimeout,
  authorize("can_delete"),
  activityMiddleware(
    "Branches",
    "Deleted",
    (req) => `Deleted branch ID: ${req.params.id}`,
  )(deleteBranch),
);

export default router;
