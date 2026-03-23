// Sidebar Component
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <aside className="sidebar">
      <nav>
        <Link 
          to="/dashboard" 
          className={`nav-link ${isActive('/dashboard')}`}
        >
          📊 Dashboard
        </Link>
        
        <Link 
          to="/students" 
          className={`nav-link ${isActive('/students')}`}
        >
          👨‍🎓 Students
        </Link>
        
        <Link 
          to="/payments" 
          className={`nav-link ${isActive('/payments')}`}
        >
          💳 Payments
        </Link>
        
        <Link 
          to="/expenses" 
          className={`nav-link ${isActive('/expenses')}`}
        >
          💸 Expenses
        </Link>
        
        <Link 
          to="/reports" 
          className={`nav-link ${isActive('/reports')}`}
        >
          📈 Reports
        </Link>
      </nav>
    </aside>
  );
}
