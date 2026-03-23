// Main App Component
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import StudentsList from './pages/StudentsList';
import StudentDetail from './pages/StudentDetail';
import PaymentsList from './pages/PaymentsList';
import ExpensesList from './pages/ExpensesList';
import ReportsPage from './pages/ReportsPage';
import './index.css';

const THEME_KEY = 'ui-theme';

const resolveInitialTheme = () => {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Protected Route Component
const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  const { user, loading, login, logout, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  if (loading) {
    return (
      <div className="spinner"></div>
    );
  }

  return (
    <Router>
      {isAuthenticated ? (
        <>
          <Navbar
            user={user}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onLogout={logout}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
          <div style={{ display: 'flex' }}>
            {sidebarOpen && <Sidebar />}
            <div className="main-content" style={{ width: sidebarOpen ? 'calc(100% - 250px)' : '100%' }}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/students" element={<StudentsList />} />
                <Route path="/students/:id" element={<StudentDetail />} />
                <Route path="/payments" element={<PaymentsList />} />
                <Route path="/expenses" element={<ExpensesList />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </div>
        </>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={login} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </Router>
  );
}
