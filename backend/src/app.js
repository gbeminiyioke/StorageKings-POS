import express from "express";
import cors from "cors";
import path from "path";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://uat.canaraellimited.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      //allow server-to-server / curl / mobile apps
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

/* Handle preflight requests */
//app.options("*", cors());

/*=====================================
  BODY PARSING
=======================================*/
//**app.use(express.json({ limit: "10mb" }));
//**app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/uploads", express.static("uploads"));

app.use(express.json());

export default app;
