// frontend/src/App.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import "./App.css";
import LiveMatchTracker from "./components/LiveMatchTracker";
import WorldCupCalendar from "./components/WorldCupCalendar";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";

const LEAGUES = [
  { id: 39, name: "Premier League", color: "#2563EB" },
  { id: 140, name: "La Liga", color: "#EA580C" },
  { id: 78, name: "Bundesliga", color: "#DC2626" },
  { id: 135, name: "Serie A", color: "#059669" },
  { id: 61, name: "Ligue 1", color: "#7C3AED" },
];

function App() {
  const [activeTab, setActiveTab] = useState("standings");
  const [selectedLeague, setSelectedLeague] = useState(LEAGUES[0]);
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatAnswer, setChatAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [rankings, setRankings] = useState([]);
  const [wcMatches, setWcMatches] = useState([]);
  const [groupsData, setGroupsData] = useState({});
  const [topScorers, setTopScorers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        if (activeTab === "standings") {
          const res = await axios.get(
            `${API_BASE}/standings?league=${encodeURIComponent(selectedLeague.name)}`,
          );
          setStandings(res.data);
        } else if (activeTab === "matches") {
          const res = await axios.get(
            `${API_BASE}/matches?league=${encodeURIComponent(selectedLeague.name)}`,
          );
          setMatches(res.data);
        }
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, selectedLeague]);

  useEffect(() => {
    if (activeTab === "international") {
      const fetchInternationalData = async () => {
        setLoading(true);
        try {
          const [rankingsRes, matchesRes, groupsRes, scorersRes] =
            await Promise.all([
              axios.get(`${API_BASE}/fifa-rankings?limit=20`),
              axios.get(`${API_BASE}/world-cup/matches`),
              axios.get(`${API_BASE}/world-cup/groups`),
              axios.get(`${API_BASE}/world-cup/top-scorers`),
            ]);
          setRankings(rankingsRes.data);
          setWcMatches(matchesRes.data);
          setGroupsData(groupsRes.data);
          setTopScorers(scorersRes.data);
        } catch (err) {
          setError("Failed to load international data");
        } finally {
          setLoading(false);
        }
      };
      fetchInternationalData();
    }
  }, [activeTab]);

  const handleAskAI = async () => {
    if (!chatQuestion.trim()) return;
    setLoading(true);
    setChatAnswer("");
    setError("");
    try {
      const res = await axios.post(`${API_BASE}/chat`, {
        question: chatQuestion,
      });
      setChatAnswer(res.data.answer || res.data.reply || "No answer received.");
    } catch (err) {
      setError("AI agent temporarily unavailable");
    } finally {
      setLoading(false);
    }
  };

  const chartData = standings.slice(0, 5).map((team) => ({
    name: team.team_name,
    points: team.points,
  }));

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      <div className="container">
        <header>
          <h1>Football Analyst</h1>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </header>

        <div className="league-bar">
          {LEAGUES.map((league) => (
            <button
              key={league.id}
              className={`league-btn ${selectedLeague.id === league.id ? "active" : ""}`}
              onClick={() => setSelectedLeague(league)}
            >
              {league.name}
            </button>
          ))}
        </div>

        <div className="tabs">
          <button
            className={activeTab === "standings" ? "active" : ""}
            onClick={() => setActiveTab("standings")}
          >
            Standings
          </button>
          <button
            className={activeTab === "matches" ? "active" : ""}
            onClick={() => setActiveTab("matches")}
          >
            Matches
          </button>
          <button
            className={activeTab === "chat" ? "active" : ""}
            onClick={() => setActiveTab("chat")}
          >
            AI Analyst
          </button>
          <button
            className={activeTab === "international" ? "active" : ""}
            onClick={() => setActiveTab("international")}
          >
            World Cup
          </button>
          <button
            className={activeTab === "live" ? "active" : ""}
            onClick={() => setActiveTab("live")}
          >
            Live
          </button>
          <button
            className={activeTab === "calendar" ? "active" : ""}
            onClick={() => setActiveTab("calendar")}
          >
            Calendar
          </button>
        </div>

        <div className="content">
          {loading && <div className="loader">Loading...</div>}
          {error && <div className="error">{error}</div>}

          {!loading && !error && activeTab === "standings" && (
            <div className="standings-panel">
              <h2>{selectedLeague.name}</h2>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Team</th>
                      <th>Pld</th>
                      <th>GF</th>
                      <th>GA</th>
                      <th>GD</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team) => (
                      <tr key={team.team_id}>
                        <td>{team.rank}</td>
                        <td>{team.team_name}</td>
                        <td>{team.played}</td>
                        <td>{team.goals_for}</td>
                        <td>{team.goals_against}</td>
                        <td>{team.goals_for - team.goals_against}</td>
                        <td className="pts">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {standings.length > 0 && (
                <div className="chart">
                  <h3>Top 5 Teams</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="points"
                        fill={selectedLeague.color}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === "matches" && (
            <div className="matches-panel">
              <h2>{selectedLeague.name}</h2>
              <div className="matches-list">
                {matches.map((match) => (
                  <div className="match" key={match.id}>
                    <div className="match-date">{match.match_date}</div>
                    <div className="match-teams">
                      <span>{match.home_team_name}</span>
                      <span className="score">
                        {match.home_score ?? "?"} - {match.away_score ?? "?"}
                      </span>
                      <span>{match.away_team_name}</span>
                    </div>
                    <div className="match-status">{match.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && activeTab === "chat" && (
            <div className="chat-panel">
              <h2>AI Football Analyst</h2>
              <div className="chat-area">
                <input
                  type="text"
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  onKeyPress={(e) => e.key === "Enter" && handleAskAI()}
                  disabled={loading}
                />
                <button onClick={handleAskAI} disabled={loading}>
                  Send
                </button>
              </div>
              {chatAnswer && <div className="chat-answer">{chatAnswer}</div>}
            </div>
          )}

          {!loading && !error && activeTab === "international" && (
            <div className="international-panel">
              <h2>World Cup 2026</h2>

              <div className="groups">
                <h3>Group Standings</h3>
                <div className="groups-grid">
                  {Object.entries(groupsData).map(([group, teams]) => (
                    <div className="group" key={group}>
                      <h4>Group {group}</h4>
                      <table>
                        <tbody>
                          {teams.map((team) => (
                            <tr key={team.team_id}>
                              <td>{team.team_name}</td>
                              <td className="pts">{team.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rankings">
                <h3>FIFA Rankings</h3>
                <div className="rankings-list">
                  {rankings.slice(0, 10).map((team) => (
                    <div className="ranking" key={team.id}>
                      <span>{team.fifa_ranking}</span>
                      <span>{team.name}</span>
                      <span>{team.ranking_points}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="scorers">
                <h3>Golden Boot</h3>
                <div className="scorers-list">
                  {topScorers.slice(0, 5).map((scorer, idx) => (
                    <div className="scorer" key={idx}>
                      <span>{idx + 1}</span>
                      <span>{scorer.player_name}</span>
                      <span>{scorer.team_name}</span>
                      <span>{scorer.goals}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === "live" && (
            <div className="live-panel">
              <LiveMatchTracker />
            </div>
          )}

          {!loading && !error && activeTab === "calendar" && (
            <div className="calendar-panel">
              <WorldCupCalendar />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
