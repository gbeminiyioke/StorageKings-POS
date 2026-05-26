import multer from "multer";
import fs from "fs";
import path from "path";

/* =====================================
   DIRECTORIES
===================================== */

const customerDir = "uploads/customers";
const indemnityDir = "uploads/indemnity";
const warehouseDir = "uploads/warehouse";

[customerDir, indemnityDir, warehouseDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
});

/* =====================================
   STORAGE CONFIG
===================================== */

const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (file.fieldname === "indemnity_agreement") {
      cb(null, indemnityDir);
    } else if (file.fieldname === "warehouse_agreement") {
      cb(null, warehouseDir);
    } else {
      cb(null, customerDir);
    }
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname);

    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

/* =====================================
   FILE FILTER
===================================== */

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/x-pdf",

    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only PDF and image files are allowed"), false);
  }

  cb(null, true);
};

export default multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});
