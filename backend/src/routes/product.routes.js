import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.js";
import { sessionTimeout } from "../middleware/sessionTimeout.js";
import activityMiddleware from "../middleware/activityMiddleware.js";
import multer from "multer";
import path from "path";

import {
  createProduct,
  updateProduct,
  getProducts,
  deleteProduct,
  getCategories,
  getProductById,
  getProductsByBarcode,
  searchProducts,
  getProductBranches,
  checkSku,
  getPOSProducts,
} from "../controllers/product.controller.js";

// Multer config (memory storage for easier handling)
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Routes
router.get("/", authenticate, getProducts);
router.get("/categories", authenticate, getCategories);
router.get("/search", authenticate, searchProducts);
router.get("/check-sku", authenticate, checkSku);
router.get("/barcode/:product_code", getProductsByBarcode);
router.get("/:id/branches", authenticate, getProductBranches);
router.get("/pos", authenticate, getPOSProducts);
router.get("/:id", authenticate, getProductById);

router.post(
  "/",
  authenticate,
  sessionTimeout,
  authorize("can_create"),
  upload.single("image"),
  activityMiddleware(
    "Products",
    "Create",
    (req) => `Created product: ${req.body.product_name}`,
  )(createProduct),
);

router.put(
  "/:id",
  authenticate,
  sessionTimeout,
  authorize("can_edit"),
  upload.single("image"),
  activityMiddleware(
    "Products",
    "Update",
    (req) => `Updated product: ${req.body.product_name}`,
  )(updateProduct),
);

router.delete(
  "/:id",
  authenticate,
  sessionTimeout,
  authorize("can_delete"),
  activityMiddleware(
    "Products",
    "Delete",
    (req) => `Deleted product ID: ${req.params.id}`,
  )(deleteProduct),
);

export default router;
