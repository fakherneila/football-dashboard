// backend/fetchInternational.js - Complete FIFA/World Cup mock data
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./football.db");

// Clear existing international data
async function clearInternationalData() {
  await new Promise((resolve) => {
    db.run(`DELETE FROM fifa_teams`, () => resolve());
  });
  await new Promise((resolve) => {
    db.run(`DELETE FROM international_matches`, () => resolve());
  });
  await new Promise((resolve) => {
    db.run(`DELETE FROM world_cup_groups`, () => resolve());
  });
  await new Promise((resolve) => {
    db.run(`DELETE FROM international_top_scorers`, () => resolve());
  });
  console.log("✅ Cleared existing international data");
}

// FIFA Top 20 Rankings (June 2026 - realistic)
const FIFA_TEAMS = [
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
  {
    id: 11,
    name: "Germany",
    code: "GER",
    ranking: 11,
    points: 1710,
    confederation: "UEFA",
  },
  {
    id: 12,
    name: "Uruguay",
    code: "URU",
    ranking: 12,
    points: 1695,
    confederation: "CONMEBOL",
  },
  {
    id: 13,
    name: "Colombia",
    code: "COL",
    ranking: 13,
    points: 1680,
    confederation: "CONMEBOL",
  },
  {
    id: 14,
    name: "Morocco",
    code: "MAR",
    ranking: 14,
    points: 1665,
    confederation: "CAF",
  },
  {
    id: 15,
    name: "USA",
    code: "USA",
    ranking: 15,
    points: 1650,
    confederation: "CONCACAF",
  },
  {
    id: 16,
    name: "Mexico",
    code: "MEX",
    ranking: 16,
    points: 1635,
    confederation: "CONCACAF",
  },
  {
    id: 17,
    name: "Japan",
    code: "JPN",
    ranking: 17,
    points: 1620,
    confederation: "AFC",
  },
  {
    id: 18,
    name: "Senegal",
    code: "SEN",
    ranking: 18,
    points: 1605,
    confederation: "CAF",
  },
  {
    id: 19,
    name: "Switzerland",
    code: "SUI",
    ranking: 19,
    points: 1590,
    confederation: "UEFA",
  },
  {
    id: 20,
    name: "Australia",
    code: "AUS",
    ranking: 20,
    points: 1575,
    confederation: "AFC",
  },
];

// World Cup 2026 Groups
const WORLD_CUP_GROUPS = [
  { group: "A", teams: ["Argentina", "Mexico", "Japan", "Senegal"] },
  { group: "B", teams: ["France", "Uruguay", "Morocco", "Australia"] },
  { group: "C", teams: ["Brazil", "Colombia", "USA", "Switzerland"] },
  { group: "D", teams: ["England", "Croatia", "Germany", "Japan"] },
  { group: "E", teams: ["Belgium", "Spain", "Netherlands", "Portugal"] },
  { group: "F", teams: ["Italy", "Germany", "Poland", "South Korea"] },
  { group: "G", teams: ["Portugal", "Netherlands", "Ecuador", "Ghana"] },
  { group: "H", teams: ["Spain", "Croatia", "Serbia", "Cameroon"] },
];

// Helper to get team ID by name
function getTeamIdByName(name) {
  const team = FIFA_TEAMS.find((t) => t.name === name);
  return team ? team.id : null;
}

// Generate realistic World Cup 2026 group stage results
function generateWorldCupMatches() {
  const matches = [];
  let matchId = 10000;
  const startDate = new Date(2026, 5, 14);

  // Group stage matches
  for (const group of WORLD_CUP_GROUPS) {
    const teams = group.teams;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + Math.floor(Math.random() * 14));

        const homeScore = Math.floor(Math.random() * 4);
        const awayScore = Math.floor(Math.random() * 4);

        matches.push({
          id: matchId++,
          home_team: teams[i],
          away_team: teams[j],
          home_score: homeScore,
          away_score: awayScore,
          competition: "World Cup 2026",
          stage: "Group Stage",
          match_date: date.toISOString().slice(0, 10),
          status: "finished",
          venue: `${group.group} Stadium`,
        });
      }
    }
  }

  return matches;
}

// Generate group standings based on match results
function generateGroupStandings(matches) {
  const standings = [];
  const teamStats = {};

  // Initialize stats for all teams
  for (const team of FIFA_TEAMS) {
    teamStats[team.name] = {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gf: 0,
      ga: 0,
      points: 0,
    };
  }

  // Process matches to calculate stats
  for (const match of matches) {
    if (match.stage !== "Group Stage") continue;

    const home = match.home_team;
    const away = match.away_team;
    const homeScore = match.home_score;
    const awayScore = match.away_score;

    if (teamStats[home]) {
      teamStats[home].played++;
      teamStats[home].gf += homeScore;
      teamStats[home].ga += awayScore;

      if (homeScore > awayScore) {
        teamStats[home].wins++;
        teamStats[home].points += 3;
      } else if (homeScore === awayScore) {
        teamStats[home].draws++;
        teamStats[home].points += 1;
      } else {
        teamStats[home].losses++;
      }
    }

    if (teamStats[away]) {
      teamStats[away].played++;
      teamStats[away].gf += awayScore;
      teamStats[away].ga += homeScore;

      if (awayScore > homeScore) {
        teamStats[away].wins++;
        teamStats[away].points += 3;
      } else if (awayScore === homeScore) {
        teamStats[away].draws++;
        teamStats[away].points += 1;
      } else {
        teamStats[away].losses++;
      }
    }
  }

  // Create standings entries for each team in each group
  for (const group of WORLD_CUP_GROUPS) {
    for (const teamName of group.teams) {
      const team = FIFA_TEAMS.find((t) => t.name === teamName);
      if (team && teamStats[teamName]) {
        standings.push({
          group_name: group.group,
          team_id: team.id,
          played: teamStats[teamName].played,
          wins: teamStats[teamName].wins,
          draws: teamStats[teamName].draws,
          losses: teamStats[teamName].losses,
          goals_for: teamStats[teamName].gf,
          goals_against: teamStats[teamName].ga,
          points: teamStats[teamName].points,
        });
      }
    }
  }

  return standings;
}

// Golden Boot race
const TOP_SCORERS = [
  { name: "Kylian Mbappé", team: "France", goals: 7, assists: 2 },
  { name: "Lionel Messi", team: "Argentina", goals: 5, assists: 3 },
  { name: "Vinícius Jr", team: "Brazil", goals: 5, assists: 1 },
  { name: "Harry Kane", team: "England", goals: 4, assists: 2 },
  { name: "Julián Álvarez", team: "Argentina", goals: 4, assists: 1 },
  { name: "Erling Haaland", team: "Norway", goals: 4, assists: 0 },
  { name: "Marcus Rashford", team: "England", goals: 3, assists: 2 },
];

async function main() {
  console.log("🌍 Generating FIFA / World Cup 2026 data...\n");

  await clearInternationalData();

  // Insert FIFA teams
  const today = new Date().toISOString().slice(0, 10);
  for (const team of FIFA_TEAMS) {
    await new Promise((resolve) => {
      db.run(
        `INSERT INTO fifa_teams (id, name, country_code, fifa_ranking, ranking_points, confederation, ranking_date) 
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
        () => resolve(),
      );
    });
    console.log(`✅ FIFA: ${team.name} (#${team.ranking})`);
  }

  // Generate and insert World Cup matches
  const matches = generateWorldCupMatches();
  for (const match of matches) {
    const homeTeamId = getTeamIdByName(match.home_team);
    const awayTeamId = getTeamIdByName(match.away_team);

    await new Promise((resolve) => {
      db.run(
        `INSERT INTO international_matches 
                    (id, home_team_id, away_team_id, competition, stage, match_date, status, home_score, away_score, venue)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          match.id,
          homeTeamId,
          awayTeamId,
          match.competition,
          match.stage,
          match.match_date,
          match.status,
          match.home_score,
          match.away_score,
          match.venue,
        ],
        () => resolve(),
      );
    });
  }
  console.log(`\n✅ ${matches.length} World Cup matches generated`);

  // Generate and insert group standings
  const groupStandings = generateGroupStandings(matches);
  for (const standing of groupStandings) {
    await new Promise((resolve) => {
      db.run(
        `INSERT INTO world_cup_groups 
                    (group_name, team_id, played, wins, draws, losses, goals_for, goals_against, points)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          standing.group_name,
          standing.team_id,
          standing.played,
          standing.wins,
          standing.draws,
          standing.losses,
          standing.goals_for,
          standing.goals_against,
          standing.points,
        ],
        () => resolve(),
      );
    });
  }
  console.log(`✅ World Cup group standings calculated`);

  // Insert top scorers
  for (const scorer of TOP_SCORERS) {
    const team = FIFA_TEAMS.find((t) => t.name === scorer.team);
    if (team) {
      await new Promise((resolve) => {
        db.run(
          `INSERT INTO international_top_scorers (player_name, team_id, goals, competition, assists, matches_played)
                        VALUES (?, ?, ?, ?, ?, ?)`,
          [
            scorer.name,
            team.id,
            scorer.goals,
            "World Cup 2026",
            scorer.assists,
            4,
          ],
          () => resolve(),
        );
      });
    }
  }
  console.log(`✅ Golden Boot race: ${TOP_SCORERS.length} players`);

  console.log("\n🎉 FIFA / World Cup data complete!");
  db.close();
}

main();
