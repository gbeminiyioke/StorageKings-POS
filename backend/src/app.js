import express from "express";
import cors from "cors";
import path from "path";

const app = express();

/* ======================================================
   CORS
====================================================== */

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5000",
  "https://uat.canaraellimited.com",
  "https://pos.storagekingslagos.com",
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

/* ======================================================
   BODY PARSING
====================================================== */

app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

/* ======================================================
   STATIC UPLOADS
====================================================== */

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

export default app;
