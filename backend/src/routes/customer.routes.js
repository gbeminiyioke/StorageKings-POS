import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import {
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
} from "../controllers/customer.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(sessionTimeout);

router.get("/search", searchCustomers);
router.get("/", authorize("can_view"), getCustomers);
router.post("/", authorize("can_create"), createCustomer);
router.put("/:id", authorize("can_edit"), updateCustomer);
router.delete("/:id", authorize("can_delete"), deleteCustomer);

export default router;
