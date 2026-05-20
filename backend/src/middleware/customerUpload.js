import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = "uploads/customers";

/* =====================================
   CREATE DIRECTORY IF MISSING
===================================== */
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

/* =====================================
   STORAGE CONFIG
===================================== */
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
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
    /* PDFs */
    "application/pdf",
    "application/x-pdf",

    /* Images */
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only PDF and image files are allowed"), false);
  }

  cb(null, true);
};

/* =====================================
   EXPORT
===================================== */
export default multer({
  storage,
  fileFilter,
  limits: {
    /* 20MB */
    fileSize: 20 * 1024 * 1024,
  },
});
