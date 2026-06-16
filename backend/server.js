const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const axios = require("axios");
const { OpenAI } = require("openai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Open (or create) SQLite database
const db = new sqlite3.Database(process.env.DB_PATH || "./football.db");

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

// ============ CLUB FOOTBALL ENDPOINTS ============

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

// GET /api/health
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

// GET /api/daily-data-all-with-fifa
app.get("/api/daily-data-all-with-fifa", async (req, res) => {
  try {
    const leagues = [
      "Premier League",
      "La Liga",
      "Bundesliga",
      "Serie A",
      "Ligue 1",
    ];
    const leaguesData = {};

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
      leaguesData[league] = { standings, matches };
    }

    const fifaRankings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM fifa_teams ORDER BY fifa_ranking LIMIT 10`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });

    const topScorers = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT its.player_name, its.goals, ft.name as team_name
              FROM international_top_scorers its
              JOIN fifa_teams ft ON its.team_id = ft.id
              WHERE its.competition = 'World Cup 2026'
              ORDER BY its.goals DESC
              LIMIT 5`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });

    res.json({
      leagues: leaguesData,
      fifaRankings: fifaRankings,
      topScorers: topScorers,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============ INTERNATIONAL ENDPOINTS ============

// GET /api/fifa-rankings
app.get("/api/fifa-rankings", (req, res) => {
  const { limit = 20 } = req.query;
  db.all(
    `SELECT * FROM fifa_teams ORDER BY fifa_ranking LIMIT ?`,
    [parseInt(limit)],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

// GET /api/world-cup/groups
app.get("/api/world-cup/groups", (req, res) => {
  db.all(
    `
    SELECT wcg.*, ft.name as team_name, ft.fifa_ranking
    FROM world_cup_groups wcg
    JOIN fifa_teams ft ON wcg.team_id = ft.id
    ORDER BY wcg.group_name, wcg.points DESC
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

// ============ LIVE MATCH TRACKER ============

// GET /api/live-matches - Returns live matches (ESPN API + fallback)
app.get("/api/live-matches", async (req, res) => {
  try {
    const response = await axios.get(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard",
    );
    const events = response.data?.events || [];

    const liveMatches = events.map((event) => ({
      id: event.id,
      homeTeam:
        event.competitions[0]?.competitors[1]?.team?.displayName || "Unknown",
      awayTeam:
        event.competitions[0]?.competitors[0]?.team?.displayName || "Unknown",
      homeScore: event.competitions[0]?.competitors[1]?.score || 0,
      awayScore: event.competitions[0]?.competitors[0]?.score || 0,
      minute: event.status?.type?.shortDetail || "LIVE",
      status: event.status?.type?.description || "LIVE",
      competition: "World Cup 2026",
      venue: event.competitions[0]?.venue?.fullName || "TBD",
    }));

    res.json(liveMatches.length > 0 ? liveMatches : generateMockLiveMatches());
  } catch (error) {
    res.json(generateMockLiveMatches());
  }
});

// GET /api/match-stats/:matchId
app.get("/api/match-stats/:matchId", (req, res) => {
  res.json({
    possession: [52, 48],
    shots: [8, 5],
    shotsOnTarget: [4, 2],
    corners: [3, 1],
    fouls: [6, 8],
    yellowCards: [1, 2],
    redCards: [0, 0],
    passes: [342, 298],
    passAccuracy: [84, 79],
  });
});

// ============ WORLD CUP FIXTURES ============

// GET /api/worldcup/fixtures - World Cup schedule
app.get("/api/worldcup/fixtures", async (req, res) => {
  try {
    const response = await axios.get(
      "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
    );
    const allMatches = response.data.matches || [];
    const today = new Date().toISOString().slice(0, 10);

    const pastMatches = allMatches.filter((m) => m.date < today);
    const upcomingMatches = allMatches.filter((m) => m.date >= today);

    const formatMatch = (match) => ({
      id: `${match.date}-${match.team1}`,
      date: match.date,
      time: match.time || "TBD",
      homeTeam: match.team1,
      awayTeam: match.team2,
      homeScore: match.score1 !== undefined ? match.score1 : null,
      awayScore: match.score2 !== undefined ? match.score2 : null,
      status: match.score1 !== undefined ? "played" : "scheduled",
      venue: match.ground || "TBD",
      group: match.group || "Knockout",
    });

    const groups = {};
    const groupMatches = allMatches.filter(
      (m) => m.group && !m.group.includes("Knockout"),
    );
    for (const match of groupMatches) {
      if (!groups[match.group]) groups[match.group] = [];
      if (!groups[match.group].includes(match.team1))
        groups[match.group].push(match.team1);
      if (!groups[match.group].includes(match.team2))
        groups[match.group].push(match.team2);
    }
    for (const group in groups) groups[group].sort();

    res.json({
      upcoming: upcomingMatches.map(formatMatch),
      past: pastMatches.map(formatMatch),
      groups: groups,
    });
  } catch (error) {
    res.json(generateEmergencyFallbackFixtures());
  }
});

// ============ HELPER FUNCTIONS ============

function generateMockLiveMatches() {
  return [
    {
      id: 1001,
      homeTeam: "Brazil",
      awayTeam: "Argentina",
      homeScore: 2,
      awayScore: 1,
      minute: "67",
      status: "LIVE",
      competition: "World Cup 2026",
      venue: "MetLife Stadium",
    },
    {
      id: 1002,
      homeTeam: "France",
      awayTeam: "England",
      homeScore: 0,
      awayScore: 0,
      minute: "32",
      status: "LIVE",
      competition: "World Cup 2026",
      venue: "SoFi Stadium",
    },
    {
      id: 1003,
      homeTeam: "Germany",
      awayTeam: "Spain",
      homeScore: 1,
      awayScore: 0,
      minute: "89",
      status: "LIVE",
      competition: "World Cup 2026",
      venue: "AT&T Stadium",
    },
  ];
}

function generateEmergencyFallbackFixtures() {
  const today = new Date();
  return {
    upcoming: [
      {
        id: "1",
        date: "2026-06-14",
        time: "14:00",
        homeTeam: "Brazil",
        awayTeam: "Argentina",
        status: "scheduled",
        venue: "MetLife Stadium",
        group: "Group A",
      },
      {
        id: "2",
        date: "2026-06-15",
        time: "17:00",
        homeTeam: "France",
        awayTeam: "Germany",
        status: "scheduled",
        venue: "SoFi Stadium",
        group: "Group B",
      },
    ],
    past: [],
    groups: {
      "Group A": ["Brazil", "Argentina", "Mexico", "Poland"],
      "Group B": ["France", "Germany", "Netherlands", "Japan"],
    },
  };
}


// ============ MISSING ENDPOINTS - ADD THESE ============

// GET /api/worldcup/live - Alias for live-matches
app.get("/api/worldcup/live", async (req, res) => {
    try {
        const response = await axios.get('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
        const events = response.data?.events || [];
        
        const liveMatches = events.map(event => ({
            id: event.id,
            homeTeam: event.competitions[0]?.competitors[1]?.team?.displayName || "Unknown",
            awayTeam: event.competitions[0]?.competitors[0]?.team?.displayName || "Unknown",
            homeScore: event.competitions[0]?.competitors[1]?.score || 0,
            awayScore: event.competitions[0]?.competitors[0]?.score || 0,
            minute: event.status?.type?.shortDetail || "LIVE",
            status: "LIVE",
            competition: "World Cup 2026",
            venue: event.competitions[0]?.venue?.fullName || "TBD"
        }));
        
        res.json(liveMatches.length > 0 ? liveMatches : generateMockLiveMatches());
    } catch (error) {
        res.json(generateMockLiveMatches());
    }
});

// GET /api/world-cup/matches - World Cup matches
app.get("/api/world-cup/matches", async (req, res) => {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');
        const matches = response.data.matches || [];
        
        const formattedMatches = matches.map(match => ({
            id: match.id,
            homeTeam: match.team1,
            awayTeam: match.team2,
            homeScore: match.score1,
            awayScore: match.score2,
            date: match.date,
            time: match.time,
            venue: match.ground,
            stage: match.round || "Group Stage",
            status: match.score1 !== undefined ? "FINISHED" : "SCHEDULED"
        }));
        
        res.json(formattedMatches);
    } catch (error) {
        res.json([]);
    }
});

// Helper function for mock live matches
function generateMockLiveMatches() {
    return [
        { id: 1001, homeTeam: "Brazil", awayTeam: "Argentina", homeScore: 2, awayScore: 1, minute: "67", status: "LIVE", competition: "World Cup 2026", venue: "MetLife Stadium" },
        { id: 1002, homeTeam: "France", awayTeam: "England", homeScore: 0, awayScore: 0, minute: "32", status: "LIVE", competition: "World Cup 2026", venue: "SoFi Stadium" }
    ];
}


// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend running at http://0.0.0.0:${PORT}`);
});
