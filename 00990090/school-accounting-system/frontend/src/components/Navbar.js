// Navbar Component
import React from 'react';

export default function Navbar({ user, theme, onToggleTheme, onLogout, onToggleSidebar }) {
  const isDark = theme === 'dark';

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button 
          onClick={onToggleSidebar}
          className="navbar-menu-btn"
        >
          ☰
        </button>
        <h1>School Accounting System</h1>

        {user && (
          <div className="navbar-user-group">
            <span className="navbar-user">
              👤 {user.name} <small style={{ opacity: 0.8 }}>({user.role})</small>
            </span>
            <button
              onClick={onToggleTheme}
              className="btn btn-theme"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              {isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            </button>
          </div>
        )}
      </div>
      
      <div className="navbar-right">
        {user && (
          <>
            <button 
              onClick={onLogout}
              className="btn btn-danger"
              style={{ padding: '8px 15px', fontSize: '12px' }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
