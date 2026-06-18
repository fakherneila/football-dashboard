// frontend/src/App.jsx
import { useState, useEffect, useCallback } from "react";
import {
  fetchRegions,
  fetchRankings,
  fetchSummary,
  fetchTopPerformers,
  fetchTransactions,
} from "./services/api";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatsCards from "./components/StatsCards";
import RankingsTable from "./components/RankingsTable";
import TransactionsList from "./components/TransactionsList";
import TopPerformers from "./components/TopPerformers";
import RegionChart from "./components/RegionChart";
import AIAnalyst from "./components/AIAnalyst";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("North America");
  const [rankings, setRankings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // Wrap fetchAllData in useCallback
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        regionsRes,
        rankingsRes,
        summaryRes,
        performersRes,
        transactionsRes,
      ] = await Promise.all([
        fetchRegions(),
        fetchRankings(selectedRegion),
        fetchSummary(),
        fetchTopPerformers(),
        fetchTransactions({ limit: 10 }),
      ]);
      setRegions(regionsRes.data);
      setRankings(rankingsRes.data);
      setSummary(summaryRes.data);
      setTopPerformers(performersRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedRegion]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRegionChange = (region) => {
    setSelectedRegion(region);
  };

  if (loading) {
    return (
      <div className="loading-screen">Loading Business Intelligence...</div>
    );
  }

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          regions={regions}
          selectedRegion={selectedRegion}
          onRegionChange={handleRegionChange}
        />

        <div className="content-area">
          {activeTab === "dashboard" && (
            <>
              <StatsCards summary={summary} />
              <div className="dashboard-grid">
                <RankingsTable rankings={rankings} />
                <RegionChart rankings={rankings} />
              </div>
              <div className="dashboard-grid">
                <TopPerformers performers={topPerformers} />
                <TransactionsList transactions={transactions} />
              </div>
            </>
          )}
          {activeTab === "rankings" && (
            <RankingsTable rankings={rankings} full />
          )}
          {activeTab === "transactions" && (
            <TransactionsList transactions={transactions} full />
          )}
          {activeTab === "performers" && (
            <TopPerformers performers={topPerformers} full />
          )}
          {activeTab === "analyst" && <AIAnalyst />}
        </div>
      </div>
    </div>
  );
}

export default App;
