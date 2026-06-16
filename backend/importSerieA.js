// backend/importSerieA.js
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const db = new sqlite3.Database("./football.db");

const matches = JSON.parse(fs.readFileSync("serie_a_matches.json"));

for (const match of matches.matches) {
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  const homeScore = match.score?.fullTime?.home ?? null;
  const awayScore = match.score?.fullTime?.away ?? null;
  const matchDate = match.utcDate?.slice(0, 10);
  let statusText = "scheduled";
  if (match.status === "FINISHED") statusText = "finished";

  db.run(
    `INSERT OR REPLACE INTO matches (id, league_id, home_team_id, away_team_id, match_date, status, home_score, away_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      match.id,
      "SA",
      homeTeam.id,
      awayTeam.id,
      matchDate,
      statusText,
      homeScore,
      awayScore,
    ],
  );
}

console.log("✅ Serie A matches imported");
db.close();
