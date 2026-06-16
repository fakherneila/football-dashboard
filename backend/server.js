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

// GET /api/matches
app.get("/api/matches", (req, res) => {
  const { league, date } = req.query;
  let sql = `
    SELECT m.*, ht.name as home_team_name, at.name as away_team_name
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

// GET /api/standings
app.get("/api/standings", (req, res) => {
  const { league } = req.query;
  if (!league)
    return res.status(400).json({ error: "Missing league parameter" });

  db.all(
    `SELECT s.*, t.name as team_name, t.logo_url
     FROM standings s
     JOIN teams t ON s.team_id = t.id
     WHERE s.league_id = (SELECT id FROM leagues WHERE name = ?)
       AND s.snapshot_date = (SELECT MAX(snapshot_date) FROM standings WHERE league_id = s.league_id)
     ORDER BY s.rank`,
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
    `SELECT t.name, SUM(m.home_score) as goals_scored, COUNT(*) as matches_played
     FROM teams t
     LEFT JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id)
     WHERE t.id = ? AND m.status = 'FT'`,
    [teamId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || {});
    },
  );
});

// GET /api/topscorers
app.get("/api/topscorers", (req, res) => {
  res.json([{ message: "Will implement with real player data" }]);
});

// POST /api/chat – AI Football Analyst
app.post("/api/chat", async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "Missing question" });

  try {
    let context = "";
    const leagues = [
      "Premier League",
      "La Liga",
      "Bundesliga",
      "Serie A",
      "Ligue 1",
    ];
    for (const league of leagues) {
      const rows = await new Promise((resolve, reject) => {
        db.all(
          `SELECT t.name, s.points, s.rank, (s.goals_for - s.goals_against) as goal_diff
           FROM standings s JOIN teams t ON s.team_id = t.id
           WHERE s.league_id = (SELECT id FROM leagues WHERE name = ?)
           AND s.snapshot_date = (SELECT MAX(snapshot_date) FROM standings)
           ORDER BY s.rank LIMIT 10`,
          [league],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          },
        );
      });
      if (rows.length) {
        context +=
          `\n${league} Top 10:\n` +
          rows
            .map(
              (r) =>
                `${r.rank}. ${r.name} – ${r.points} pts (GD: ${r.goal_diff})`,
            )
            .join("\n");
      }
    }

    const recentMatches = await new Promise((resolve, reject) => {
      db.all(
        `SELECT m.match_date, ht.name as home, at.name as away, m.home_score, m.away_score
         FROM matches m
         JOIN teams ht ON m.home_team_id = ht.id
         JOIN teams at ON m.away_team_id = at.id
         WHERE m.status = 'finished'
         ORDER BY m.match_date DESC LIMIT 10`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    context +=
      "\n\nRecent finished matches:\n" +
      recentMatches
        .map(
          (m) =>
            `${m.match_date}: ${m.home} ${m.home_score} - ${m.away_score} ${m.away}`,
        )
        .join("\n");

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a world‑class football analyst. Use the provided data to answer concisely.",
        },
        {
          role: "user",
          content: `Football data:\n${context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (error) {
    console.error("AI error:", error);
    res.status(500).json({ error: "AI agent temporarily unavailable" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /api/daily-data-all
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

// GET /api/daily-data (single league)
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

// ========== INTERNATIONAL ENDPOINTS ==========

// GET /api/fifa-rankings
app.get("/api/fifa-rankings", (req, res) => {
  const { limit = 20, confederation } = req.query;
  let sql = `SELECT * FROM fifa_teams ORDER BY fifa_ranking LIMIT ?`;
  let params = [parseInt(limit)];

  if (confederation) {
    sql = `SELECT * FROM fifa_teams WHERE confederation = ? ORDER BY fifa_ranking LIMIT ?`;
    params = [confederation, parseInt(limit)];
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/world-cup/matches
app.get("/api/world-cup/matches", (req, res) => {
  const { stage, team } = req.query;
  let sql = `
    SELECT im.*, ht.name as home_team, at.name as away_team
    FROM international_matches im
    JOIN fifa_teams ht ON im.home_team_id = ht.id
    JOIN fifa_teams at ON im.away_team_id = at.id
    WHERE im.competition = 'World Cup 2026'
  `;
  const params = [];

  if (stage) {
    sql += ` AND im.stage = ?`;
    params.push(stage);
  }
  if (team) {
    sql += ` AND (ht.name = ? OR at.name = ?)`;
    params.push(team, team);
  }
  sql += ` ORDER BY im.match_date`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/world-cup/groups
app.get("/api/world-cup/groups", (req, res) => {
  db.all(
    `
    SELECT wcg.*, ft.name as team_name, ft.fifa_ranking
    FROM world_cup_groups wcg
    JOIN fifa_teams ft ON wcg.team_id = ft.id
    ORDER BY wcg.group_name, wcg.points DESC, (wcg.goals_for - wcg.goals_against) DESC
  `,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const grouped = {};
      for (const row of rows) {
        if (!grouped[row.group_name]) grouped[row.group_name] = [];
        grouped[row.group_name].push(row);
      }
      res.json(grouped);
    },
  );
});

// GET /api/world-cup/top-scorers
app.get("/api/world-cup/top-scorers", (req, res) => {
  db.all(
    `
    SELECT DISTINCT its.player_name, its.goals, ft.name as team_name
    FROM international_top_scorers its
    JOIN fifa_teams ft ON its.team_id = ft.id
    WHERE its.competition = 'World Cup 2026'
    ORDER BY its.goals DESC
    LIMIT 10
  `,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});


// GET /api/daily-data-all-with-fifa
app.get("/api/daily-data-all-with-fifa", async (req, res) => {
  try {
    // Get leagues data
    const leagues = ["Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1"];
    const leaguesData = {};
    
    for (const league of leagues) {
      const standings = await new Promise((resolve, reject) => {
        db.all(`SELECT s.*, t.name as team_name FROM standings s 
                JOIN teams t ON s.team_id = t.id 
                WHERE s.league_id = (SELECT id FROM leagues WHERE name = ?) 
                AND s.snapshot_date = (SELECT MAX(snapshot_date) FROM standings)
                ORDER BY s.rank`, [league], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
      const matches = await new Promise((resolve, reject) => {
        db.all(`SELECT m.*, ht.name as home_team_name, at.name as away_team_name 
                FROM matches m 
                JOIN teams ht ON m.home_team_id = ht.id 
                JOIN teams at ON m.away_team_id = at.id 
                WHERE m.league_id = (SELECT id FROM leagues WHERE name = ?) 
                ORDER BY m.match_date DESC LIMIT 10`, [league], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
      leaguesData[league] = { standings, matches };
    }
    
    // Get FIFA rankings
    const fifaRankings = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM fifa_teams ORDER BY fifa_ranking LIMIT 10`, (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    
    // Get top scorers
    const topScorers = await new Promise((resolve, reject) => {
      db.all(`SELECT DISTINCT its.player_name, its.goals, ft.name as team_name
              FROM international_top_scorers its
              JOIN fifa_teams ft ON its.team_id = ft.id
              WHERE its.competition = 'World Cup 2026'
              ORDER BY its.goals DESC
              LIMIT 5`, (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    
    res.json({
      leagues: leaguesData,
      fifaRankings: fifaRankings,
      topScorers: topScorers
    });
    
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});



// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend running at http://0.0.0.0:${PORT}`);
});
