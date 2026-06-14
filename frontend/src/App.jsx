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

const API_BASE = "http://localhost:3001/api";

const LEAGUES = [
  { id: 39, name: "Premier League", color: "#37003c" },
  { id: 140, name: "La Liga", color: "#ffb300" },
  { id: 78, name: "Bundesliga", color: "#d50000" },
  { id: 135, name: "Serie A", color: "#0066cc" },
  { id: 61, name: "Ligue 1", color: "#0055a0" },
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
        console.error(err);
        setError("Failed to load data. Is the backend running?");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, selectedLeague]);

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
      console.error(err);
      setError("AI agent temporarily unavailable. Please try again.");
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
      <div className="bg-pattern"></div>
      <div className="container">
        <header>
          <h1>
            <span className="icon">⚽</span> Football Analyst Dashboard
          </h1>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </header>

        <div className="league-selector">
          <label>🏆 Select League</label>
          <div className="league-buttons">
            {LEAGUES.map((league) => (
              <button
                key={league.id}
                className={`league-btn ${selectedLeague.id === league.id ? "active" : ""}`}
                style={{ borderBottomColor: league.color }}
                onClick={() => setSelectedLeague(league)}
              >
                {league.name}
              </button>
            ))}
          </div>
        </div>

        <div className="tabs">
          <button
            className={activeTab === "standings" ? "active" : ""}
            onClick={() => setActiveTab("standings")}
          >
            📊 Standings
          </button>
          <button
            className={activeTab === "matches" ? "active" : ""}
            onClick={() => setActiveTab("matches")}
          >
            🗓️ Matches
          </button>
          <button
            className={activeTab === "chat" ? "active" : ""}
            onClick={() => setActiveTab("chat")}
          >
            🤖 AI Analyst
          </button>
        </div>

        <div className="content">
          {loading && !error && (
            <div className="loader">
              <div className="spinner"></div>
              <p>Loading data...</p>
            </div>
          )}
          {error && <div className="error-message">{error}</div>}

          {!loading && !error && activeTab === "standings" && (
            <div className="standings">
              <h2>{selectedLeague.name} Table</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th>Pts</th>
                      <th>Pld</th>
                      <th>GF</th>
                      <th>GA</th>
                      <th>GD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team) => (
                      <tr key={team.team_id}>
                        <td className="rank">{team.rank}</td>
                        <td className="team-name">{team.team_name}</td>
                        <td className="points">{team.points}</td>
                        <td>{team.played}</td>
                        <td>{team.goals_for}</td>
                        <td>{team.goals_against}</td>
                        <td className="gd">
                          {team.goals_for - team.goals_against}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {standings.length > 0 && (
                <div className="chart-container">
                  <h3>📈 Top 5 Teams by Points</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: darkMode ? "#ccc" : "#333" }}
                      />
                      <YAxis tick={{ fill: darkMode ? "#ccc" : "#333" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkMode ? "#1e1e2f" : "#fff",
                          border: "none",
                        }}
                      />
                      <Bar
                        dataKey="points"
                        fill={selectedLeague.color}
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === "matches" && (
            <div className="matches">
              <h2>{selectedLeague.name} – Recent & Upcoming</h2>
              {matches.length === 0 ? (
                <p className="empty-state">No matches found for this league.</p>
              ) : (
                <div className="matches-grid">
                  {matches.map((match) => (
                    <div className="match-card" key={match.id}>
                      <div className="match-date">{match.match_date}</div>
                      <div className="match-teams">
                        <span className="team home">
                          {match.home_team_name}
                        </span>
                        <span className="score">
                          {match.home_score ?? "?"} – {match.away_score ?? "?"}
                        </span>
                        <span className="team away">
                          {match.away_team_name}
                        </span>
                      </div>
                      <div className="match-status">{match.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === "chat" && (
            <div className="chat">
              <h2>🤖 Ask the AI Football Analyst</h2>
              <div className="chat-container">
                <div className="chat-input-area">
                  <input
                    type="text"
                    value={chatQuestion}
                    onChange={(e) => setChatQuestion(e.target.value)}
                    placeholder="e.g., Who has the best attack in La Liga?"
                    disabled={loading}
                    onKeyPress={(e) => e.key === "Enter" && handleAskAI()}
                  />
                  <button onClick={handleAskAI} disabled={loading}>
                    {loading ? "Thinking..." : "Ask"}
                  </button>
                </div>
                {chatAnswer && (
                  <div className="chat-bubble">
                    <div className="bubble-avatar">🤖</div>
                    <div className="bubble-text">{chatAnswer}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
