import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import { createCustomerKyc } from "../controllers/customerKyc.controller.js";

const router = express.Router();

const uploadPath = "uploads/customer-kyc";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(
        file.originalname,
      )}`,
    );
  },
});

const upload = multer({
  storage,
});

router.post(
  "/create",
  upload.fields([
    { name: "clientSignature", maxCount: 1 },
    { name: "authorisedSignature", maxCount: 1 },
  ]),
  createCustomerKyc,
);

export default router;
