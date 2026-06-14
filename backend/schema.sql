-- backend/schema.sql

-- Leagues (e.g., Premier League, La Liga)
CREATE TABLE IF NOT EXISTS leagues (
    id INTEGER PRIMARY KEY,
    name TEXT,
    country TEXT,
    season INTEGER
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY,
    name TEXT,
    logo_url TEXT
);

-- Matches (fixtures)
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    league_id INTEGER,
    home_team_id INTEGER,
    away_team_id INTEGER,
    match_date TEXT,
    status TEXT,          -- 'FT', 'NS', 'LIVE', etc.
    home_score INTEGER,
    away_score INTEGER,
    FOREIGN KEY(league_id) REFERENCES leagues(id),
    FOREIGN KEY(home_team_id) REFERENCES teams(id),
    FOREIGN KEY(away_team_id) REFERENCES teams(id)
);

-- Standings snapshots (one per day per league)
CREATE TABLE IF NOT EXISTS standings (
    id INTEGER PRIMARY KEY,
    league_id INTEGER,
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

-- AI reports (we'll use on Day 3/4)
CREATE TABLE IF NOT EXISTS ai_reports (
    id INTEGER PRIMARY KEY,
    type TEXT,            -- 'daily' or 'match'
    match_id INTEGER,
    content TEXT,
    created_at TEXT
);




