import { useState } from "react";
import { apiPost } from "../api";

export default function Login({ onLogin, theme, onToggleTheme }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const isDark = theme === "dark";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiPost("/auth/login", { email, password });
      localStorage.setItem("token", res.token);
      onLogin(res.token);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login">
      <div className="login-toolbar">
        <button
          type="button"
          className="theme-toggle compact"
          onClick={onToggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
      <form onSubmit={handleSubmit} className="login-card">
        <h1>Welcome Back</h1>
        <p>Sign in to manage school accounts.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
        />
        {error && <span className="error">{error}</span>}
        <button className="primary" type="submit">
          Sign In
        </button>
        <small>Demo user: admin@school.local / admin123</small>
      </form>
    </div>
  );
}
