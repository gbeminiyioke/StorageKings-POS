import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDir = path.resolve("uploads/storage");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${timestamp}_${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "application/zip" ||
    file.originalname.toLowerCase().endsWith(".zip")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only ZIP files are allowed"));
  }
};

export const storageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});
