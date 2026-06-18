// frontend/src/components/RankingsTable.jsx
function RankingsTable({ rankings, full }) {
  const displayData = full ? rankings : rankings.slice(0, 10);

  if (!displayData || displayData.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Branch Rankings</div>
        <p style={{ color: "rgba(255,255,255,0.4)" }}>No data available</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">🏆 Branch Rankings {!full && "(Top 10)"}</div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Branch</th>
              <th>Region</th>
              <th>Revenue</th>
              <th>Deals</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="rank-badge">#{row.rank}</span>
                </td>
                <td>
                  <strong>{row.branch_name}</strong>
                </td>
                <td>{row.region_name || "-"}</td>
                <td>${(row.total_revenue / 1000000).toFixed(1)}M</td>
                <td>{row.transactions_count}</td>
                <td>${(row.total_profit / 1000000).toFixed(1)}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RankingsTable;
