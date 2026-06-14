const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const { OpenAI } = require("openai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Open (or create) SQLite database
const db = new sqlite3.Database("./football.db");

// Initialize Groq client (OpenAI-compatible)
// Your OPENAI_API_KEY in .env is actually a Groq key (starts with gsk_)
const openai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize database tables from schema.sql
const schemaSQL = fs.readFileSync("./schema.sql", "utf8");
db.exec(schemaSQL, (err) => {
  if (err) console.error("Schema error:", err.message);
  else console.log("✅ Database tables ready");
});

// ---------- API ENDPOINTS ----------

// GET /api/matches?league=PL&date=2025-04-01
app.get("/api/matches", (req, res) => {
  const { league, date } = req.query;
  let sql = `
        SELECT m.*, 
               ht.name as home_team_name, 
               at.name as away_team_name
        FROM matches m
        JOIN teams ht ON m.home_team_id = ht.id
        JOIN teams at ON m.away_team_id = at.id
    `;
  const params = [];
  if (league) {
    sql += ` WHERE m.league_id = (SELECT id FROM leagues WHERE name = ?)`;
    params.push(league);
  }
  if (date) {
    sql += params.length ? ` AND m.match_date = ?` : ` WHERE m.match_date = ?`;
    params.push(date);
  }
  sql += ` ORDER BY m.match_date DESC LIMIT 50`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/standings?league=PL
app.get("/api/standings", (req, res) => {
  const { league } = req.query;
  if (!league)
    return res.status(400).json({ error: "Missing league parameter" });

  db.all(
    `
        SELECT s.*, t.name as team_name, t.logo_url
        FROM standings s
        JOIN teams t ON s.team_id = t.id
        WHERE s.league_id = (SELECT id FROM leagues WHERE name = ?)
          AND s.snapshot_date = (SELECT MAX(snapshot_date) FROM standings WHERE league_id = s.league_id)
        ORDER BY s.rank
    `,
    [league],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

// GET /api/teams/:id/stats
app.get("/api/teams/:id/stats", (req, res) => {
  const teamId = req.params.id;
  db.get(
    `
        SELECT t.name, 
               SUM(m.home_score) as goals_scored,
               COUNT(*) as matches_played
        FROM teams t
        LEFT JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id)
        WHERE t.id = ? AND m.status = 'FT'
    `,
    [teamId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || {});
    },
  );
});

// GET /api/topscorers?league=PL
app.get("/api/topscorers", (req, res) => {
  res.json([{ message: "Will implement with real player data on Day 2" }]);
});

// POST /api/chat – AI Football Analyst (using Groq)
// POST /api/chat – Intelligent AI Football Analyst
app.post("/api/chat", async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Missing question" });
  }

  try {
    // 1. Fetch full context from database
    let context = "";

    // Standings for all 5 leagues (top 10 only to save tokens)
    const leagues = ["Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1"];
    for (const league of leagues) {
      const rows = await new Promise((resolve, reject) => {
        db.all(
          `SELECT t.name, s.points, s.rank, s.goals_for, s.goals_against, 
                  (s.goals_for - s.goals_against) as goal_diff
           FROM standings s
           JOIN teams t ON s.team_id = t.id
           WHERE s.league_id = (SELECT id FROM leagues WHERE name = ?)
           AND s.snapshot_date = (SELECT MAX(snapshot_date) FROM standings)
           ORDER BY s.rank LIMIT 10`,
          [league],
          (err, rows) => { if (err) reject(err); else resolve(rows); }
        );
      });
      if (rows.length) {
        context += `\n${league} Top 10:\n` + rows.map(r => 
          `${r.rank}. ${r.name} – ${r.points} pts (GD: ${r.goal_diff})`
        ).join("\n");
      }
    }

    // Recent matches (last 10 finished matches with scores)
    const recentMatches = await new Promise((resolve, reject) => {
      db.all(
        `SELECT m.match_date, ht.name as home, at.name as away, m.home_score, m.away_score
         FROM matches m
         JOIN teams ht ON m.home_team_id = ht.id
         JOIN teams at ON m.away_team_id = at.id
         WHERE m.status = 'finished'
         ORDER BY m.match_date DESC LIMIT 10`,
        (err, rows) => { if (err) reject(err); else resolve(rows); }
      );
    });
    context += "\n\nRecent finished matches:\n" + recentMatches.map(m =>
      `${m.match_date}: ${m.home} ${m.home_score} - ${m.away_score} ${m.away}`
    ).join("\n");

    // Team form for top 5 teams across leagues (optional – adds richness)
    const topTeams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT t.name FROM standings s
         JOIN teams t ON s.team_id = t.id
         WHERE s.rank <= 2 AND s.snapshot_date = (SELECT MAX(snapshot_date) FROM standings)
         LIMIT 5`,
        (err, rows) => { if (err) reject(err); else resolve(rows.map(r => r.name)); }
      );
    });
    for (const team of topTeams) {
      const form = await new Promise((resolve, reject) => {
        db.all(
          `SELECT m.match_date, ht.name as home, at.name as away, m.home_score, m.away_score
           FROM matches m
           JOIN teams ht ON m.home_team_id = ht.id
           JOIN teams at ON m.away_team_id = at.id
           WHERE (ht.name = ? OR at.name = ?) AND m.status = 'finished'
           ORDER BY m.match_date DESC LIMIT 5`,
          [team, team],
          (err, rows) => { if (err) reject(err); else resolve(rows); }
        );
      });
      if (form.length) {
        context += `\n\n${team} last 5 matches: ` +
          form.map(m => `${m.home} ${m.home_score}-${m.away_score} ${m.away}`).join(", ");
      }
    }

    // 2. Call Groq (or OpenAI) with full context
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a world‑class football analyst. Use the provided data to answer the user's question. 
          Be insightful, compare teams, mention goal difference and recent form when relevant. 
          If the data doesn't contain the answer, say so honestly.`
        },
        {
          role: "user",
          content: `Football data:\n${context}\n\nQuestion: ${question}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = completion.choices[0].message.content;
    res.json({ answer });

  } catch (error) {
    console.error("AI error:", error);
    res.status(500).json({ error: "AI agent temporarily unavailable" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// NEW: Get daily data for ALL top 5 leagues
app.get("/api/daily-data-all", async (req, res) => {
  const leagues = [
    "Premier League",
    "La Liga",
    "Bundesliga",
    "Serie A",
    "Ligue 1",
  ];
  const result = {};

  for (const league of leagues) {
    const standings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT s.*, t.name as team_name FROM standings s 
              JOIN teams t ON s.team_id = t.id 
              WHERE s.league_id = (SELECT id FROM leagues WHERE name = ?) 
              AND s.snapshot_date = (SELECT MAX(snapshot_date) FROM standings)
              ORDER BY s.rank`,
        [league],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    const matches = await new Promise((resolve, reject) => {
      db.all(
        `SELECT m.*, ht.name as home_team_name, at.name as away_team_name 
              FROM matches m 
              JOIN teams ht ON m.home_team_id = ht.id 
              JOIN teams at ON m.away_team_id = at.id 
              WHERE m.league_id = (SELECT id FROM leagues WHERE name = ?) 
              ORDER BY m.match_date DESC LIMIT 10`,
        [league],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    result[league] = { standings, matches };
  }
  res.json(result);
});

// NEW: Combined daily data endpoint (single league)
app.get("/api/daily-data", (req, res) => {
  const league = req.query.league || "Premier League";

  db.all(
    `SELECT s.*, t.name as team_name FROM standings s 
          JOIN teams t ON s.team_id = t.id 
          WHERE s.league_id = (SELECT id FROM leagues WHERE name = ?) 
          AND s.snapshot_date = (SELECT MAX(snapshot_date) FROM standings)
          ORDER BY s.rank`,
    [league],
    (err, standings) => {
      if (err) return res.status(500).json({ error: err.message });

      db.all(
        `SELECT m.*, ht.name as home_team_name, at.name as away_team_name 
            FROM matches m 
            JOIN teams ht ON m.home_team_id = ht.id 
            JOIN teams at ON m.away_team_id = at.id 
            WHERE m.league_id = (SELECT id FROM leagues WHERE name = ?) 
            ORDER BY m.match_date DESC LIMIT 20`,
        [league],
        (err, matches) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ standings, matches });
        },
      );
    },
  );
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend running at http://0.0.0.0:${PORT}`);
});
