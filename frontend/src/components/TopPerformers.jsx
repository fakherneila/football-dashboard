// frontend/src/components/TopPerformers.jsx
function TopPerformers({ performers, full }) {
  const displayData = full ? performers : performers.slice(0, 5);

  if (!displayData || displayData.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Top Performers</div>
        <p style={{ color: "rgba(255,255,255,0.4)" }}>No performers data</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">⭐ Top Performers {!full && "(Top 5)"}</div>
      {displayData.map((p, idx) => (
        <div key={p.id || idx} className="performer-item">
          <span className="performer-rank">#{idx + 1}</span>
          <span className="performer-name">{p.name}</span>
          <span className="performer-role">{p.role}</span>
          <span className="performer-sales">
            ${(p.total_sales / 1000000).toFixed(1)}M
          </span>
        </div>
      ))}
    </div>
  );
}

export default TopPerformers;
