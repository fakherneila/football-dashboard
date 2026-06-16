// frontend/src/components/LiveMatchTracker.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import "./LiveMatchTracker.css";

const API_BASE = "http://localhost:3001/api";

const LiveMatchTracker = () => {
  const [liveMatches, setLiveMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchStats, setMatchStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const intervalRef = useRef(null);

  // Helper functions - defined with useCallback to prevent recreation
  const addNotification = useCallback((message) => {
    const newNotification = {
      id: performance.now() + Math.random(),
      message,
      timestamp: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 5));

    setTimeout(() => {
      setNotifications((prev) =>
        prev.filter((n) => n.id !== newNotification.id),
      );
    }, 5000);
  }, []);


const fetchLiveMatches = useCallback(async () => {
  try {
    // Use the new World Cup endpoint
    const response = await axios.get(`${API_BASE}/worldcup/live`);
    setLiveMatches(response.data);
    setLoading(false);
  } catch (error) {
    console.error("Error fetching live matches:", error);
    setLoading(false);
  }
}, []);

const fetchMatchStats = useCallback(async (matchId) => {
  try {
    const response = await axios.get(`${API_BASE}/worldcup/match/${matchId}`);
    setMatchStats(response.data);
  } catch (error) {
    console.error("Error fetching match stats:", error);
  }
}, []);

  const handleMatchClick = useCallback(
    (match) => {
      setSelectedMatch(match);
      fetchMatchStats(match.id);
      addNotification(`Following ${match.homeTeam} vs ${match.awayTeam}`);
    },
    [fetchMatchStats, addNotification],
  );

  const getScoreClass = (score, opponentScore) => {
    if (score > opponentScore) return "winning";
    if (opponentScore > score) return "losing";
    return "draw";
  };

  // Fetch live matches every 10 seconds
  useEffect(() => {
    fetchLiveMatches();
    intervalRef.current = setInterval(fetchLiveMatches, 10000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchLiveMatches]);

  if (loading) {
    return <div className="live-tracker-loading">Loading live matches...</div>;
  }

  return (
    <div className="live-tracker">
      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map((notif) => (
          <div key={notif.id} className="notification">
            <span className="notification-icon">⚡</span>
            <span className="notification-message">{notif.message}</span>
          </div>
        ))}
      </div>

      {/* Live Matches Grid */}
      <div className="live-matches-grid">
        <h3 className="section-title">
          <span className="live-indicator"></span>
          Live Now ({liveMatches.length})
        </h3>

        {liveMatches.length === 0 ? (
          <div className="no-live-matches">
            <p>No live matches at the moment</p>
            <span>Check back during match hours</span>
          </div>
        ) : (
          <div className="matches-container">
            {liveMatches.map((match) => (
              <div
                key={match.id}
                className={`live-match-card ${selectedMatch?.id === match.id ? "selected" : ""}`}
                onClick={() => handleMatchClick(match)}
              >
                <div className="competition-badge">{match.competition}</div>

                <div className="match-teams">
                  <div className="team">
                    <span className="team-name">{match.homeTeam}</span>
                    <span
                      className={`team-score ${getScoreClass(match.homeScore, match.awayScore)}`}
                    >
                      {match.homeScore}
                    </span>
                  </div>
                  <div className="match-vs">VS</div>
                  <div className="team">
                    <span className="team-name">{match.awayTeam}</span>
                    <span
                      className={`team-score ${getScoreClass(match.awayScore, match.homeScore)}`}
                    >
                      {match.awayScore}
                    </span>
                  </div>
                </div>

                <div className="match-minute">
                  <span className="live-dot"></span>
                  {match.minute}'
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Statistics Panel */}
      {selectedMatch && matchStats && (
        <div className="match-stats-panel">
          <div className="stats-header">
            <h4>Match Statistics</h4>
            <button
              className="close-stats"
              onClick={() => setSelectedMatch(null)}
            >
              ×
            </button>
          </div>

          <div className="stats-content">
            <div className="stats-teams">
              <span>{selectedMatch.homeTeam}</span>
              <span>{selectedMatch.awayTeam}</span>
            </div>

            <div className="stat-row">
              <span className="stat-label">Possession</span>
              <div className="stat-bar-container">
                <div
                  className="stat-bar home"
                  style={{ width: `${matchStats.possession[0]}%` }}
                >
                  {matchStats.possession[0]}%
                </div>
                <div
                  className="stat-bar away"
                  style={{ width: `${matchStats.possession[1]}%` }}
                >
                  {matchStats.possession[1]}%
                </div>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Shots</span>
              <div className="stat-values">
                <span>{matchStats.shots[0]}</span>
                <span>{matchStats.shots[1]}</span>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Shots on Target</span>
              <div className="stat-values">
                <span>{matchStats.shotsOnTarget[0]}</span>
                <span>{matchStats.shotsOnTarget[1]}</span>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Corners</span>
              <div className="stat-values">
                <span>{matchStats.corners[0]}</span>
                <span>{matchStats.corners[1]}</span>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Fouls</span>
              <div className="stat-values">
                <span>{matchStats.fouls[0]}</span>
                <span>{matchStats.fouls[1]}</span>
              </div>
            </div>

            <div className="stat-row cards">
              <span className="stat-label">Cards</span>
              <div className="stat-values">
                <span>
                  🟨 {matchStats.yellowCards[0]}
                  {matchStats.redCards[0] > 0 &&
                    ` 🟥 ${matchStats.redCards[0]}`}
                </span>
                <span>
                  🟨 {matchStats.yellowCards[1]}
                  {matchStats.redCards[1] > 0 &&
                    ` 🟥 ${matchStats.redCards[1]}`}
                </span>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Passes</span>
              <div className="stat-values">
                <span>{matchStats.passes[0]}</span>
                <span>{matchStats.passes[1]}</span>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Pass Accuracy</span>
              <div className="stat-values">
                <span>{matchStats.passAccuracy[0]}%</span>
                <span>{matchStats.passAccuracy[1]}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMatchTracker;
