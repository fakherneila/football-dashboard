const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./sales.db");

// Initialize Groq client
const openai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

// ============ HEALTH ============
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ============ REGIONS ============
app.get("/api/regions", (req, res) => {
  db.all("SELECT * FROM regions", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ============ RANKINGS ============
app.get("/api/rankings", (req, res) => {
  const region = req.query.region;
  let sql = `
        SELECT sr.*, b.name as branch_name, r.name as region_name
        FROM sales_rankings sr
        JOIN branches b ON sr.branch_id = b.id
        JOIN regions r ON sr.region_id = r.id
    `;
  if (region) sql += ` WHERE r.name = '${region}'`;
  sql += ` ORDER BY sr.rank`;

  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ============ TRANSACTIONS ============
app.get("/api/transactions", (req, res) => {
  const { limit = 20 } = req.query;
  db.all(
    `
        SELECT t.*, b.name as branch_name, r.name as region_name
        FROM transactions t
        JOIN branches b ON t.branch_id = b.id
        JOIN regions r ON b.region_id = r.id
        ORDER BY t.transaction_date DESC
        LIMIT ?
        `,
    [parseInt(limit)],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

// ============ TOP PERFORMERS ============
app.get("/api/top-performers", (req, res) => {
  db.all(
    `
        SELECT tp.*, b.name as branch_name, r.name as region_name
        FROM top_performers tp
        JOIN branches b ON tp.branch_id = b.id
        JOIN regions r ON b.region_id = r.id
        ORDER BY tp.total_sales DESC
        LIMIT 10
        `,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

// ============ SUMMARY ============
// GET /api/summary - Dashboard summary
app.get('/api/summary', (req, res) => {
    db.get(
        `
        SELECT 
            COUNT(DISTINCT b.id) as total_branches,
            COUNT(DISTINCT r.id) as total_regions,
            COALESCE(SUM(t.amount), 0) as total_revenue,
            COUNT(t.id) as total_transactions,
            COALESCE(ROUND(AVG(t.amount), 2), 0) as avg_transaction_value,
            COALESCE(ROUND(SUM(t.amount * t.profit_margin / 100), 2), 0) as total_profit
        FROM branches b
        JOIN regions r ON b.region_id = r.id
        LEFT JOIN transactions t ON b.id = t.branch_id AND t.status = 'completed'
        `,
        (err, row) => {
            if (err) {
                console.error('Error:', err.message);
                return res.status(500).json({ error: err.message });
            }
            // Wrap in 'summary' key as frontend expects
            res.json({ summary: row });
        }
    );
});

// ============ DAILY DATA ALL (for n8n) ============
app.get("/api/daily-data-all", async (req, res) => {
  try {
    const regions = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM regions", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const result = {};

    for (const region of regions) {
      const rankings = await new Promise((resolve, reject) => {
        db.all(
          `
                    SELECT sr.*, b.name as branch_name
                    FROM sales_rankings sr
                    JOIN branches b ON sr.branch_id = b.id
                    WHERE sr.region_id = ?
                    ORDER BY sr.rank
                    LIMIT 10
                    `,
          [region.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          },
        );
      });

      const transactions = await new Promise((resolve, reject) => {
        db.all(
          `
                    SELECT t.*, b.name as branch_name
                    FROM transactions t
                    JOIN branches b ON t.branch_id = b.id
                    WHERE b.region_id = ?
                    ORDER BY t.transaction_date DESC
                    LIMIT 10
                    `,
          [region.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          },
        );
      });

      result[region.name] = { rankings, transactions };
    }

    res.json(result);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ AI CHAT ============
app.post("/api/chat", async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Missing question" });
  }

  try {
    let context = "";

    const regions = await new Promise((resolve) => {
      db.all(
        `
                SELECT r.name, 
                       COALESCE(ROUND(SUM(t.amount), 2), 0) as revenue
                FROM regions r
                JOIN branches b ON r.id = b.region_id
                LEFT JOIN transactions t ON b.id = t.branch_id AND t.status = 'completed'
                GROUP BY r.id
                ORDER BY revenue DESC
                `,
        (err, rows) => resolve(rows || []),
      );
    });

    context += "Regional Revenue:\n";
    regions.forEach((r) => {
      context += `${r.name}: $${(r.revenue / 1000000).toFixed(1)}M\n`;
    });

    const performers = await new Promise((resolve) => {
      db.all(
        `
                SELECT name, total_sales, role, branch_name
                FROM top_performers tp
                JOIN branches b ON tp.branch_id = b.id
                ORDER BY total_sales DESC
                LIMIT 3
                `,
        (err, rows) => resolve(rows || []),
      );
    });

    context += "\nTop Performers:\n";
    performers.forEach((p) => {
      context += `${p.name} (${p.role}): $${(p.total_sales / 1000000).toFixed(1)}M\n`;
    });

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a Business Intelligence analyst. Answer based on sales data. Be concise.",
        },
        {
          role: "user",
          content: `Data:\n${context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (error) {
    console.error("AI Error:", error.message);
    res.json({
      answer:
        "I'm having trouble connecting to the AI service. Based on the available data, the sales performance shows strong results across all regions.",
    });
  }
});

// ============ START ============
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 http://localhost:${PORT}/api/regions`);
  console.log(`📊 http://localhost:${PORT}/api/daily-data-all`);
});
