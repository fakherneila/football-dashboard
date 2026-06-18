// backend/db.js
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "sales_user",
  password: process.env.DB_PASSWORD || "sales_pass",
  database: process.env.DB_NAME || "sales_db",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ PostgreSQL connection error:", err.stack);
  } else {
    console.log("✅ Connected to PostgreSQL (Sales DB)");
    release();
  }
});

module.exports = pool;
