import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "gbemii1",
  database: "StorageKingsLagos",
  port: 5432,
});

export default pool;
//Pool allows multiple concurrent DB queries safely
