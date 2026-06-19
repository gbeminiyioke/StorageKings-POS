import pkg from "pg";

const { Pool } = pkg;

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,

        ssl:
          process.env.NODE_ENV === "production"
            ? {
                rejectUnauthorized: false,
              }
            : false,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),

        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,

        database: process.env.DB_NAME,

        max: Number(process.env.DB_MAX_CONNECTIONS || 20),

        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,

        ssl:
          process.env.NODE_ENV === "production"
            ? {
                rejectUnauthorized: false,
              }
            : false,
      },
);

//NODE_ENV is either development or production

/* =====================================
   CONNECTION TEST
===================================== */

pool.on("connect", () => {
  console.log("PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err);
});

export default pool;
