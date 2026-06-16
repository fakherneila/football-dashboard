// frontend/src/components/WorldCupCalendar.jsx
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./WorldCupCalendar.css";

const API_BASE = "http://localhost:3001/api";

const WorldCupCalendar = () => {
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [pastMatches, setPastMatches] = useState([]);
  const [groups, setGroups] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarView, setCalendarView] = useState(false);
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchFixtures = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/worldcup/fixtures`);
      setUpcomingMatches(response.data.upcoming || []);
      setPastMatches(response.data.past || []);
      setGroups(response.data.groups || {});
      setLoading(false);
    } catch (error) {
      console.error("Error fetching fixtures:", error);
      setLoading(false);
    }
  }, []);

  const fetchCalendar = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/worldcup/calendar`);
      setCalendarData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching calendar:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (calendarView) {
      fetchCalendar();
    } else {
      fetchFixtures();
    }
  }, [calendarView, fetchFixtures, fetchCalendar]);

  const getDates = () => {
    return Object.keys(calendarData).sort();
  };

  if (loading) {
    return (
      <div className="calendar-loading">Loading World Cup fixtures...</div>
    );
  }

  return (
    <div className="worldcup-calendar">
      <div className="calendar-header">
        <h2>🏆 FIFA World Cup 2026</h2>
        <div className="view-toggle">
          <button
            className={!calendarView ? "active" : ""}
            onClick={() => setCalendarView(false)}
          >
            Fixtures
          </button>
          <button
            className={calendarView ? "active" : ""}
            onClick={() => setCalendarView(true)}
          >
            Calendar
          </button>
        </div>
      </div>

      {!calendarView ? (
        <>
          {/* Groups Overview */}
          <div className="groups-overview">
            <h3>Group Stage</h3>
            <div className="groups-grid">
              {Object.entries(groups).map(([groupName, teams]) => (
                <div key={groupName} className="group-card">
                  <div className="group-title">{groupName}</div>
                  <div className="group-teams">
                    {teams.map((team, idx) => (
                      <div key={idx} className="group-team">
                        <span className="group-team-flag">
                          {team.slice(0, 2)}
                        </span>
                        <span>{team}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Matches */}
          <div className="matches-section">
            <h3>📅 Upcoming Matches</h3>
            <div className="matches-list">
              {upcomingMatches.length === 0 ? (
                <p className="no-matches">No upcoming matches scheduled</p>
              ) : (
                upcomingMatches.map((match) => (
                  <div key={match.id} className="fixture-card">
                    <div className="fixture-date">
                      <span className="date">{match.date}</span>
                      <span className="time">{match.time}</span>
                    </div>
                    <div className="fixture-teams">
                      <div className="team home">{match.homeTeam}</div>
                      <div className="vs">VS</div>
                      <div className="team away">{match.awayTeam}</div>
                    </div>
                    <div className="fixture-details">
                      <span className="venue">📍 {match.venue}</span>
                      <span className="group-badge">{match.group}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Past Results */}
          {pastMatches.length > 0 && (
            <div className="matches-section">
              <h3>✓ Recent Results</h3>
              <div className="matches-list">
                {pastMatches.map((match) => (
                  <div key={match.id} className="fixture-card past">
                    <div className="fixture-date">
                      <span className="date">{match.date}</span>
                    </div>
                    <div className="fixture-teams">
                      <div className="team home">{match.homeTeam}</div>
                      <div className="score">
                        {match.homeScore} - {match.awayScore}
                      </div>
                      <div className="team away">{match.awayTeam}</div>
                    </div>
                    <div className="fixture-details">
                      <span className="venue">📍 {match.venue}</span>
                      <span className="group-badge">{match.group}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="calendar-view">
          <h3>Match Calendar</h3>
          <div className="calendar-dates">
            {getDates().map((date) => (
              <div key={date} className="calendar-date-group">
                <div className="calendar-date-header">{date}</div>
                <div className="calendar-matches">
                  {calendarData[date].map((match) => (
                    <div key={match.id} className="calendar-match">
                      <div className="calendar-match-teams">
                        <span>{match.homeTeam}</span>
                        <span className="calendar-vs">vs</span>
                        <span>{match.awayTeam}</span>
                      </div>
                      <div className="calendar-match-time">{match.time}</div>
                      <div className="calendar-match-venue">{match.venue}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldCupCalendar;
