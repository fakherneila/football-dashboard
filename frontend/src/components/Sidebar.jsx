// frontend/src/components/Sidebar.jsx
import DashboardIcon from "@mui/icons-material/Dashboard";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ChatIcon from "@mui/icons-material/Chat"; // Changed from ChatBubbleOutline

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { id: "rankings", label: "Rankings", icon: <FormatListBulletedIcon /> },
  { id: "transactions", label: "Transactions", icon: <ReceiptLongIcon /> },
  { id: "performers", label: "Top Performers", icon: <EmojiEventsIcon /> },
  { id: "analyst", label: "AI Analyst", icon: <ChatIcon /> }, // Changed
];

function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">📊</div>
        <div className="logo-text">
          <span className="logo-title">BUSINESS</span>
          <span className="logo-subtitle">INTELLIGENCE</span>
        </div>
      </div>
      <nav className="nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? "active" : ""}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
