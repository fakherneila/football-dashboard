// frontend/src/components/RegionChart.jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function RegionChart({ rankings }) {
  if (!rankings || rankings.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Revenue by Region</div>
        <p style={{ color: "rgba(255,255,255,0.4)" }}>No data available</p>
      </div>
    );
  }

  // Aggregate by region
  const regionData = rankings.reduce((acc, row) => {
    const region = row.region_name || "Unknown";
    if (!acc[region]) acc[region] = { name: region, revenue: 0 };
    acc[region].revenue += row.total_revenue;
    return acc;
  }, {});

  const data = Object.values(regionData);

  return (
    <div className="card">
      <div className="card-title">📊 Revenue by Region</div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)" }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.6)" }} />
          <Tooltip formatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
          <Bar dataKey="revenue" fill="#1E5A8A" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RegionChart;
