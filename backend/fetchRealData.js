// backend/fetchRealData.js - Real data from Football-Data.org with auto table creation
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const NodeCache = require("node-cache");
require("dotenv").config();

const cache = new NodeCache({ stdTTL: 3600 });
const db = new sqlite3.Database("./football.db");
const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const API_BASE = "https://api.football-data.org/v4";

// Create tables if they don't exist
const createTablesSQL = `
CREATE TABLE IF NOT EXISTS leagues (
    id TEXT PRIMARY KEY,
    name TEXT,
    country TEXT,
    season INTEGER
);

CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY,
    name TEXT,
    logo_url TEXT
);

CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    league_id TEXT,
    home_team_id INTEGER,
    away_team_id INTEGER,
    match_date TEXT,
    status TEXT,
    home_score INTEGER,
    away_score INTEGER,
    FOREIGN KEY(league_id) REFERENCES leagues(id),
    FOREIGN KEY(home_team_id) REFERENCES teams(id),
    FOREIGN KEY(away_team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS standings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id TEXT,
    team_id INTEGER,
    rank INTEGER,
    points INTEGER,
    played INTEGER,
    goals_for INTEGER,
    goals_against INTEGER,
    snapshot_date TEXT,
    FOREIGN KEY(league_id) REFERENCES leagues(id),
    FOREIGN KEY(team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS fifa_teams (
    id INTEGER PRIMARY KEY,
    name TEXT,
    country_code TEXT,
    fifa_ranking INTEGER,
    ranking_points REAL,
    confederation TEXT,
    ranking_date TEXT
);

CREATE TABLE IF NOT EXISTS international_matches (
    id INTEGER PRIMARY KEY,
    home_team_id INTEGER,
    away_team_id INTEGER,
    competition TEXT,
    stage TEXT,
    match_date TEXT,
    status TEXT,
    home_score INTEGER,
    away_score INTEGER,
    venue TEXT
);

CREATE TABLE IF NOT EXISTS world_cup_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT,
    team_id INTEGER,
    played INTEGER,
    wins INTEGER,
    draws INTEGER,
    losses INTEGER,
    goals_for INTEGER,
    goals_against INTEGER,
    points INTEGER
);

CREATE TABLE IF NOT EXISTS international_top_scorers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT,
    team_id INTEGER,
    goals INTEGER,
    competition TEXT,
    assists INTEGER,
    matches_played INTEGER
);
`;

// Initialize database
db.exec(createTablesSQL, (err) => {
  if (err) {
    console.error("❌ Table creation error:", err.message);
    process.exit(1);
  }
  console.log("✅ Database tables ready");
  main();
});

// Headers for API requests
const headers = {
  "X-Auth-Token": API_KEY,
  "Content-Type": "application/json",
};

// Top 5 leagues with their Football-Data.org IDs
const LEAGUES = [
  { id: "PL", name: "Premier League", country: "England", code: "PL" },
  { id: "PD", name: "La Liga", country: "Spain", code: "PD" },
  { id: "BL1", name: "Bundesliga", country: "Germany", code: "BL1" },
  { id: "SA", name: "Serie A", country: "Italy", code: "SA" },
  { id: "FL1", name: "Ligue 1", country: "France", code: "FL1" },
];

// API call with caching
async function apiGet(endpoint) {
  const cacheKey = endpoint;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${API_BASE}${endpoint}`, { headers });
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error(
      `API Error ${endpoint}:`,
      error.response?.status,
      error.message,
    );
    return null;
  }
}

// Fetch and store leagues
async function fetchLeagues() {
  for (const league of LEAGUES) {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO leagues (id, name, country, season) VALUES (?, ?, ?, ?)`,
        [league.id, league.name, league.country, 2024],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
    console.log(`✅ League: ${league.name}`);
  }
}

// Fetch and store standings + teams
async function fetchStandings(leagueId, leagueName) {
  console.log(`📊 Fetching standings for ${leagueName}...`);
  const data = await apiGet(`/competitions/${leagueId}/standings`);

  if (!data || !data.standings || !data.standings[0]) {
    console.log(`⚠️ No standings for ${leagueName}`);
    return;
  }

  const standings = data.standings[0].table;
  const today = new Date().toISOString().slice(0, 10);

  for (const entry of standings) {
    const team = entry.team;

    // Insert team
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO teams (id, name, logo_url) VALUES (?, ?, ?)`,
        [team.id, team.name, team.crest || ""],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    // Insert standings snapshot
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO standings (league_id, team_id, rank, points, played, goals_for, goals_against, snapshot_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          leagueId,
          team.id,
          entry.position,
          entry.points,
          entry.playedGames,
          entry.goalsFor,
          entry.goalsAgainst,
          today,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }
  console.log(`✅ Standings for ${leagueName}: ${standings.length} teams`);
}

// Fetch and store matches
// Fetch and store matches with dynamic season detection
async function fetchMatches(leagueId, leagueName, leagueCode) {
    console.log(`🗓️ Fetching matches for ${leagueName}...`);
    
    // First, get competition info to find current season
    const compInfo = await apiGet(`/competitions/${leagueCode}`);
    let seasonYear = 2024; // fallback
    
    if (compInfo && compInfo.currentSeason) {
        seasonYear = parseInt(compInfo.currentSeason.startDate.slice(0, 4));
        console.log(`   Using season: ${seasonYear}/${seasonYear+1}`);
    }
    
    const data = await apiGet(`/competitions/${leagueCode}/matches?season=${seasonYear}&limit=100`);
    
    if (!data || !data.matches) {
        console.log(`⚠️ No matches for ${leagueName} (season ${seasonYear})`);
        return;
    }
    
    let matchCount = 0;
    for (const match of data.matches) {
        const homeTeam = match.homeTeam;
        const awayTeam = match.awayTeam;
        const status = match.status;
        let statusText = 'scheduled';
        
        if (status === 'FINISHED') statusText = 'finished';
        else if (status === 'LIVE' || status === 'IN_PLAY') statusText = 'live';
        else if (status === 'PAUSED') statusText = 'live';
        
        const homeScore = match.score?.fullTime?.home ?? null;
        const awayScore = match.score?.fullTime?.away ?? null;
        const matchDate = match.utcDate?.slice(0, 10);
        
        // Ensure teams exist
        await new Promise((resolve, reject) => {
            db.run(`INSERT OR IGNORE INTO teams (id, name, logo_url) VALUES (?, ?, ?)`,
                [homeTeam.id, homeTeam.name, homeTeam.crest || ''],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });
        await new Promise((resolve, reject) => {
            db.run(`INSERT OR IGNORE INTO teams (id, name, logo_url) VALUES (?, ?, ?)`,
                [awayTeam.id, awayTeam.name, awayTeam.crest || ''],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });
        
        // Insert match
        await new Promise((resolve, reject) => {
            db.run(`INSERT OR REPLACE INTO matches (id, league_id, home_team_id, away_team_id, match_date, status, home_score, away_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [match.id, leagueId, homeTeam.id, awayTeam.id, matchDate, statusText, homeScore, awayScore],
                (err) => { if (err) reject(err); else resolve(); }
            );
        });
        matchCount++;
    }
    console.log(`✅ Matches for ${leagueName}: ${matchCount} fixtures`);
}

// Generate mock FIFA data (since Football-Data.org doesn't provide it)
function generateFIFAData() {
  const fifaTeams = [
    {
      id: 1,
      name: "Argentina",
      code: "ARG",
      ranking: 1,
      points: 1855,
      confederation: "CONMEBOL",
    },
    {
      id: 2,
      name: "France",
      code: "FRA",
      ranking: 2,
      points: 1845,
      confederation: "UEFA",
    },
    {
      id: 3,
      name: "Brazil",
      code: "BRA",
      ranking: 3,
      points: 1835,
      confederation: "CONMEBOL",
    },
    {
      id: 4,
      name: "England",
      code: "ENG",
      ranking: 4,
      points: 1810,
      confederation: "UEFA",
    },
    {
      id: 5,
      name: "Belgium",
      code: "BEL",
      ranking: 5,
      points: 1795,
      confederation: "UEFA",
    },
    {
      id: 6,
      name: "Portugal",
      code: "POR",
      ranking: 6,
      points: 1780,
      confederation: "UEFA",
    },
    {
      id: 7,
      name: "Netherlands",
      code: "NED",
      ranking: 7,
      points: 1765,
      confederation: "UEFA",
    },
    {
      id: 8,
      name: "Spain",
      code: "ESP",
      ranking: 8,
      points: 1750,
      confederation: "UEFA",
    },
    {
      id: 9,
      name: "Croatia",
      code: "CRO",
      ranking: 9,
      points: 1740,
      confederation: "UEFA",
    },
    {
      id: 10,
      name: "Italy",
      code: "ITA",
      ranking: 10,
      points: 1725,
      confederation: "UEFA",
    },
  ];

  const today = new Date().toISOString().slice(0, 10);
  for (const team of fifaTeams) {
    db.run(
      `INSERT OR REPLACE INTO fifa_teams (id, name, country_code, fifa_ranking, ranking_points, confederation, ranking_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        team.id,
        team.name,
        team.code,
        team.ranking,
        team.points,
        team.confederation,
        today,
      ],
    );
  }
  console.log(`✅ FIFA rankings seeded: ${fifaTeams.length} teams`);
}

// Main function
async function main() {
  console.log("🌍 Fetching REAL data from Football-Data.org...\n");

  if (!API_KEY) {
    console.error("❌ Missing FOOTBALL_DATA_API_KEY in .env");
    console.log("Get your free key at: https://www.football-data.org/");
    process.exit(1);
  }

  await fetchLeagues();

  for (const league of LEAGUES) {
    await fetchStandings(league.id, league.name);
    // In the main loop, change:
    await fetchMatches(league.id, league.name, league.code);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limit
  }

  // Seed FIFA data (mock, but realistic)
  generateFIFAData();

  console.log("\n🎉 Real data fetch complete!");
  db.close();
}
