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




-- International Teams (FIFA)
CREATE TABLE IF NOT EXISTS fifa_teams (
    id INTEGER PRIMARY KEY,
    name TEXT,
    country_code TEXT,
    fifa_ranking INTEGER,
    ranking_points REAL,
    confederation TEXT,  -- UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC
    ranking_date TEXT
);

-- International Matches (World Cup, Qualifiers, Friendlies)
CREATE TABLE IF NOT EXISTS international_matches (
    id INTEGER PRIMARY KEY,
    home_team_id INTEGER,
    away_team_id INTEGER,
    competition TEXT,  -- 'World Cup', 'World Cup Qualifier', 'Friendly', 'Nations League'
    stage TEXT,        -- 'Group Stage', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'
    match_date TEXT,
    status TEXT,       -- 'scheduled', 'live', 'finished'
    home_score INTEGER,
    away_score INTEGER,
    venue TEXT,
    attendance INTEGER,
    FOREIGN KEY(home_team_id) REFERENCES fifa_teams(id),
    FOREIGN KEY(away_team_id) REFERENCES fifa_teams(id)
);

-- World Cup Groups (for current tournament)
CREATE TABLE IF NOT EXISTS world_cup_groups (
    id INTEGER PRIMARY KEY,
    group_name TEXT,   -- 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'
    team_id INTEGER,
    played INTEGER,
    wins INTEGER,
    draws INTEGER,
    losses INTEGER,
    goals_for INTEGER,
    goals_against INTEGER,
    points INTEGER,
    FOREIGN KEY(team_id) REFERENCES fifa_teams(id)
);

-- Top Scorers (World Cup / International)
CREATE TABLE IF NOT EXISTS international_top_scorers (
    id INTEGER PRIMARY KEY,
    player_name TEXT,
    team_id INTEGER,
    goals INTEGER,
    competition TEXT,  -- 'World Cup 2026', 'Qualifiers', etc.
    assists INTEGER,
    matches_played INTEGER,
    FOREIGN KEY(team_id) REFERENCES fifa_teams(id)
);