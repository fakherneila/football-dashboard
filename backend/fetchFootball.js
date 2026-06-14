// backend/fetchFootball.js – Mock data generator (no API key needed)
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./football.db");

const createTablesSQL = `
CREATE TABLE IF NOT EXISTS leagues (id INTEGER PRIMARY KEY, name TEXT, country TEXT, season INTEGER);
CREATE TABLE IF NOT EXISTS teams (id INTEGER PRIMARY KEY, name TEXT, logo_url TEXT);
CREATE TABLE IF NOT EXISTS matches (id INTEGER PRIMARY KEY, league_id INTEGER, home_team_id INTEGER, away_team_id INTEGER, match_date TEXT, status TEXT, home_score INTEGER, away_score INTEGER);
CREATE TABLE IF NOT EXISTS standings (id INTEGER PRIMARY KEY, league_id INTEGER, team_id INTEGER, rank INTEGER, points INTEGER, played INTEGER, goals_for INTEGER, goals_against INTEGER, snapshot_date TEXT);
CREATE TABLE IF NOT EXISTS ai_reports (id INTEGER PRIMARY KEY, type TEXT, match_id INTEGER, content TEXT, created_at TEXT);
`;

db.exec(createTablesSQL, (err) => {
  if (err) {
    console.error("❌ Table error:", err.message);
    process.exit(1);
  }
  console.log("✅ Database tables ready");
  main();
});

// Top 5 leagues (mock)
const LEAGUES = [
  { id: 39, name: "Premier League", country: "England", season: 2024 },
  { id: 140, name: "La Liga", country: "Spain", season: 2024 },
  { id: 78, name: "Bundesliga", country: "Germany", season: 2024 },
  { id: 135, name: "Serie A", country: "Italy", season: 2024 },
  { id: 61, name: "Ligue 1", country: "France", season: 2024 },
];

// Mock team names per league
const TEAMS_BY_LEAGUE = {
  "Premier League": [
    "Manchester City",
    "Arsenal",
    "Liverpool",
    "Aston Villa",
    "Tottenham",
    "Chelsea",
    "Newcastle",
    "Manchester United",
    "West Ham",
    "Brighton",
    "Wolves",
    "Crystal Palace",
    "Brentford",
    "Everton",
    "Fulham",
    "Nottingham Forest",
    "Bournemouth",
    "Sheffield United",
    "Burnley",
    "Luton",
  ],
  "La Liga": [
    "Real Madrid",
    "Barcelona",
    "Girona",
    "Atletico Madrid",
    "Athletic Club",
    "Real Sociedad",
    "Betis",
    "Valencia",
    "Villarreal",
    "Getafe",
    "Osasuna",
    "Sevilla",
    "Celta Vigo",
    "Rayo Vallecano",
    "Mallorca",
    "Alaves",
    "Las Palmas",
    "Cadiz",
    "Granada",
    "Almeria",
  ],
  Bundesliga: [
    "Bayer Leverkusen",
    "Bayern Munich",
    "Stuttgart",
    "RB Leipzig",
    "Borussia Dortmund",
    "Frankfurt",
    "Hoffenheim",
    "Heidenheim",
    "Werder Bremen",
    "Freiburg",
    "Augsburg",
    "Wolfsburg",
    "Mainz",
    "Borussia M'gladbach",
    "Union Berlin",
    "Cologne",
    "Darmstadt",
    "Bochum",
  ],
  "Serie A": [
    "Inter",
    "AC Milan",
    "Juventus",
    "Atalanta",
    "Bologna",
    "Roma",
    "Lazio",
    "Fiorentina",
    "Napoli",
    "Torino",
    "Monza",
    "Genoa",
    "Lecce",
    "Udinese",
    "Empoli",
    "Sassuolo",
    "Verona",
    "Cagliari",
    "Frosinone",
    "Salernitana",
  ],
  "Ligue 1": [
    "PSG",
    "Monaco",
    "Brest",
    "Lille",
    "Nice",
    "Lens",
    "Marseille",
    "Reims",
    "Rennes",
    "Toulouse",
    "Strasbourg",
    "Montpellier",
    "Lyon",
    "Nantes",
    "Le Havre",
    "Metz",
    "Clermont",
    "Lorient",
  ],
};

// Helper to generate random points (realistic distribution)
function generateStandings(teams) {
  const standings = [];
  for (let i = 0; i < teams.length; i++) {
    const points = Math.floor(Math.random() * (90 - 20) + 20); // 20-90 points
    const played = 38;
    const goalsFor = Math.floor(Math.random() * 70 + 30);
    const goalsAgainst = Math.floor(Math.random() * 60 + 20);
    standings.push({
      rank: i + 1,
      points,
      played,
      goals_for: goalsFor,
      goals_against: goalsAgainst,
      team_name: teams[i],
    });
  }
  // Sort by points descending, then goal difference
  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, idx) => (s.rank = idx + 1));
  return standings;
}

// Generate random matches
function generateMatches(leagueId, leagueName, teams) {
  const matches = [];
  const today = new Date();
  let matchId = 1;
  // Generate last 7 days matches (some finished, some scheduled)
  for (let i = 7; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    // Each day, generate 5 random matches for the league
    const shuffled = [...teams];
    for (let j = shuffled.length - 1; j > 0; j--) {
      const rand = Math.floor(Math.random() * (j + 1));
      [shuffled[j], shuffled[rand]] = [shuffled[rand], shuffled[j]];
    }
    for (let k = 0; k < 5; k++) {
      const home = shuffled[k * 2];
      const away = shuffled[k * 2 + 1];
      if (!home || !away) continue;
      let status = "scheduled";
      let homeScore = null;
      let awayScore = null;
      if (i < 7) {
        // matches older than today are finished
        status = "finished";
        homeScore = Math.floor(Math.random() * 5);
        awayScore = Math.floor(Math.random() * 5);
      }
      matches.push({
        id: matchId++,
        league_id: leagueId,
        home_team: home,
        away_team: away,
        match_date: dateStr,
        status,
        home_score: homeScore,
        away_score: awayScore,
      });
    }
  }
  return matches;
}

async function main() {
  console.log("🎲 Generating mock football data...");
  for (const league of LEAGUES) {
    // Insert league
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO leagues (id, name, country, season) VALUES (?, ?, ?, ?)`,
        [league.id, league.name, league.country, league.season],
        (err) =>
          err
            ? reject(err)
            : (console.log(`✅ League: ${league.name}`), resolve()),
      );
    });

    const teamsList = TEAMS_BY_LEAGUE[league.name];
    if (!teamsList) continue;

    // Insert teams and standings
    const standings = generateStandings(teamsList);
    const today = new Date().toISOString().slice(0, 10);
    for (let idx = 0; idx < teamsList.length; idx++) {
      const teamName = teamsList[idx];
      const teamId = league.id * 1000 + idx;
      const standing = standings.find((s) => s.team_name === teamName);
      // Insert team
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO teams (id, name, logo_url) VALUES (?, ?, ?)`,
          [
            teamId,
            teamName,
            `https://via.placeholder.com/50?text=${teamName.slice(0, 2)}`,
          ],
          (err) => (err ? reject(err) : resolve()),
        );
      });
      // Insert standings
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO standings (league_id, team_id, rank, points, played, goals_for, goals_against, snapshot_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            league.id,
            teamId,
            standing.rank,
            standing.points,
            standing.played,
            standing.goals_for,
            standing.goals_against,
            today,
          ],
          (err) => (err ? reject(err) : resolve()),
        );
      });
    }
    console.log(`✅ Standings for ${league.name}`);

    // Generate and insert matches
    const matches = generateMatches(league.id, league.name, teamsList);
    for (const m of matches) {
      // Find team ids
      const homeTeamId = league.id * 1000 + teamsList.indexOf(m.home_team);
      const awayTeamId = league.id * 1000 + teamsList.indexOf(m.away_team);
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO matches (id, league_id, home_team_id, away_team_id, match_date, status, home_score, away_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            m.id,
            m.league_id,
            homeTeamId,
            awayTeamId,
            m.match_date,
            m.status,
            m.home_score,
            m.away_score,
          ],
          (err) => (err ? reject(err) : resolve()),
        );
      });
    }
    console.log(`✅ ${matches.length} matches for ${league.name}`);
  }
  console.log("🎉 Mock data generation complete!");
  db.close();
}
