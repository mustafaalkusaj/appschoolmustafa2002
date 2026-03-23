import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/students", label: "Students" },
  { to: "/payments", label: "Payments" },
  { to: "/expenses", label: "Expenses" },
  { to: "/reports", label: "Reports" }
];

export default function Sidebar({ theme, onToggleTheme }) {
  const isDark = theme === "dark";

  return (
    <aside className="sidebar">
      <div className="brand">
        <span>SA</span>
        <div>
          <strong>School Accounting</strong>
          <small>Management System</small>
        </div>
      </div>
      <nav className="nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <strong>{isDark ? "Night Mode" : "Day Mode"}</strong>
        <span>{isDark ? "Switch to light appearance" : "Switch to dark appearance"}</span>
      </button>
    </aside>
  );
}
