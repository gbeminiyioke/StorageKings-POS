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
  getCustomerPortalSummary,
  getCustomerStorageItems,
  downloadStorageAttachment,
  updateOwnProfile,
  downloadIndemnityAgreement,
  downloadWarehouseAgreement,
  createStorageVisitRequest,
  getCustomerNotifications,
  deleteNotification,
  viewStorageFormPdf,
  markNotificationAsRead,
} from "../controllers/customer.controller.js";
import upload from "../middleware/customerUpload.js";

const router = express.Router();

router.post(
  "/register",
  upload.fields([
    {
      name: "customer_id_image",
      maxCount: 1,
    },
    {
      name: "alternate_id_image",
      maxCount: 1,
    },
    {
      name: "signature_image",
      maxCount: 1,
    },
    {
      name: "indemnity_agreement",
      maxCount: 1,
    },
    {
      name: "warehouse_agreement",
      maxCount: 1,
    },
  ]),
  createCustomer,
);

router.use(authenticate);
router.use(sessionTimeout);

/* =========================================
   CUSTOMER SELF SERVICE PORTAL
========================================= */
router.get("/portal/summary", getCustomerPortalSummary);
router.get("/portal/storage/:storageId/items", getCustomerStorageItems);
router.get("/portal/storage/:storageId/download", downloadStorageAttachment);

router.put(
  "/portal/profile",
  upload.fields([
    {
      name: "customer_id_image",
      maxCount: 1,
    },
    {
      name: "alternate_id_image",
      maxCount: 1,
    },
    {
      name: "signature_image",
      maxCount: 1,
    },
    {
      name: "indemnity_agreement",
      maxCount: 1,
    },
    {
      name: "warehouse_agreement",
      maxCount: 1,
    },
  ]),
  updateOwnProfile,
);

router.post("/portal/request-visit", createStorageVisitRequest);
router.get("/portal/notifications", getCustomerNotifications);
router.put("/portal/notifications/:id/read", markNotificationAsRead);
router.put("/portal/notifications/:id/delete", deleteNotification);
router.get("/portal/storage/:storageId/view-form", viewStorageFormPdf);

router.get("/search", searchCustomers);
router.get("/", authorize("can_view"), getCustomers);
/*
router.get(
  "/:id/download-indemnity",
  authorize("can_view"),
  downloadIndemnityAgreement,
);

router.get(
  "/:id/download-warehouse",
  authorize("can_view"),
  downloadWarehouseAgreement,
);
*/

router.get("/:id/download-indemnity", downloadIndemnityAgreement);
router.get("/:id/download-warehouse", downloadWarehouseAgreement);

//router.post("/", authorize("can_create"), createCustomer);
//router.put("/:id", authorize("can_edit"), updateCustomer);

router.post(
  "/",
  authorize("can_create"),
  upload.fields([
    {
      name: "customer_id_image",
      maxCount: 1,
    },
    {
      name: "alternate_id_image",
      maxCount: 1,
    },
    {
      name: "signature_image",
      maxCount: 1,
    },
    {
      name: "indemnity_agreement",
      maxCount: 1,
    },
    {
      name: "warehouse_agreement",
      maxCount: 1,
    },
  ]),
  createCustomer,
);

router.put(
  "/:id",
  authorize("can_edit"),
  upload.fields([
    {
      name: "customer_id_image",
      maxCount: 1,
    },
    {
      name: "alternate_id_image",
      maxCount: 1,
    },
    {
      name: "signature_image",
      maxCount: 1,
    },
    {
      name: "indemnity_agreement",
      maxCount: 1,
    },
    {
      name: "warehouse_agreement",
      maxCount: 1,
    },
  ]),
  updateCustomer,
);

router.delete("/:id", authorize("can_delete"), deleteCustomer);

export default router;
