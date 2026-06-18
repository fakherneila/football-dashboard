// frontend/src/components/StatsCards.jsx
import { Skeleton } from "@mui/material";

function StatsCards({ summary }) {
  if (!summary) {
    return (
      <div className="stats-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card">
            <Skeleton variant="text" width={80} height={20} />
            <Skeleton variant="text" width={120} height={32} />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Total Revenue",
      value: `$${(summary.summary.total_revenue / 1000000).toFixed(1)}M`,
      sub: `${summary.summary.total_transactions} transactions`,
    },
    {
      label: "Total Branches",
      value: summary.summary.total_branches,
      sub: `${summary.summary.total_regions} regions`,
    },
    {
      label: "Avg Transaction",
      value: `$${summary.summary.avg_transaction_value.toFixed(2)}`,
      sub: "per deal",
    },
    {
      label: "Total Profit",
      value: `$${(summary.summary.total_profit / 1000000).toFixed(1)}M`,
      sub: "margin included",
    },
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat, idx) => (
        <div key={idx} className="stat-card">
          <div className="label">{stat.label}</div>
          <div className="value">{stat.value}</div>
          <div className="sub">{stat.sub}</div>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;
