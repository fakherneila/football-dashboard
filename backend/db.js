// backend/db.js
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "football_user",
  password: process.env.DB_PASSWORD || "football_pass",
  database: process.env.DB_NAME || "football_db",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to PostgreSQL:", err.stack);
  } else {
    console.log("✅ Connected to PostgreSQL");
    release();
  }
});

module.exports = pool;
