// frontend/src/components/Header.jsx
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

function Header({
  darkMode,
  setDarkMode,
  regions,
  selectedRegion,
  onRegionChange,
}) {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h2>Sales Dashboard</h2>
        <div className="region-selector">
          <select
            value={selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
          >
            {regions.map((region) => (
              <option key={region.id} value={region.name}>
                {region.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
      </button>
    </header>
  );
}

export default Header;
