"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { SchoolLogo } from "@/components/brand";

export default function StudentLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const locale = useLocale();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const messages: Record<string, string> = {
          invalid_credentials: locale === "ar"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : "Invalid email or password",
          inactive_account: locale === "ar"
            ? "الحساب معطل، راجع إدارة المدرسة"
            : "Account is disabled, contact school admin",
          too_many_attempts: locale === "ar"
            ? "محاولات كثيرة، حاول لاحقاً"
            : "Too many attempts, try later",
        };
        setError(messages[data.reason] ?? messages.invalid_credentials);
        return;
      }

      router.push(`/${locale}/student`);
    } catch {
      setError(
        locale === "ar"
          ? "حدث خطأ، حاول مرة أخرى"
          : "Something went wrong, try again",
      );
    } finally {
      setLoading(false);
    }
  }

  const isAr = locale === "ar";

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="student-login-page"
    >
      <style>{`
        .student-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #065F46 0%, #047857 30%, #10B981 100%);
          padding: 1rem;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .student-login-card {
          background: #fff;
          border-radius: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          width: 100%;
          max-width: 420px;
          padding: 2.5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }
        .student-login-logo {
          width: 72px;
          height: 72px;
          border-radius: 1rem;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #D1FAE5;
        }
        .student-login-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #065F46;
          margin: 0;
          text-align: center;
        }
        .student-login-subtitle {
          font-size: 0.9rem;
          color: #6B7280;
          margin: -0.75rem 0 0;
          text-align: center;
        }
        .student-login-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .student-login-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .student-login-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
        }
        .student-login-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1.5px solid #D1D5DB;
          border-radius: 0.75rem;
          font-size: 1rem;
          color: #111827;
          background: #F9FAFB;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .student-login-input:focus {
          border-color: #10B981;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
          background: #fff;
        }
        .student-login-error {
          background: #FEF2F2;
          color: #DC2626;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.85rem;
          text-align: center;
          border: 1px solid #FECACA;
        }
        .student-login-btn {
          width: 100%;
          padding: 0.875rem;
          background: #065F46;
          color: #fff;
          border: none;
          border-radius: 0.75rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          margin-top: 0.25rem;
        }
        .student-login-btn:hover:not(:disabled) {
          background: #047857;
        }
        .student-login-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .student-login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .student-login-back {
          font-size: 0.85rem;
          color: #6B7280;
          text-decoration: none;
          text-align: center;
        }
        .student-login-back:hover {
          color: #065F46;
          text-decoration: underline;
        }
      `}</style>

      <div className="student-login-card">
        <div className="student-login-logo">
          <SchoolLogo size={56} alt="" />
        </div>

        <h1 className="student-login-title">
          {isAr ? "بوابة الطالب" : "Student Portal"}
        </h1>
        <p className="student-login-subtitle">
          {isAr
            ? "سجل دخولك للوصول إلى درجاتك وحضورك وجدولك"
            : "Sign in to access your grades, attendance, and schedule"}
        </p>

        <form className="student-login-form" onSubmit={handleSubmit}>
          <div className="student-login-field">
            <label className="student-login-label" htmlFor="student-email">
              {isAr ? "البريد الإلكتروني" : "Email"}
            </label>
            <input
              id="student-email"
              className="student-login-input"
              type="email"
              autoComplete="email"
              required
              dir="ltr"
              placeholder="student@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="student-login-field">
            <label className="student-login-label" htmlFor="student-password">
              {isAr ? "كلمة المرور" : "Password"}
            </label>
            <input
              id="student-password"
              className="student-login-input"
              type="password"
              autoComplete="current-password"
              required
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="student-login-error">{error}</div>}

          <button
            type="submit"
            className="student-login-btn"
            disabled={loading}
          >
            {loading
              ? (isAr ? "جاري الدخول..." : "Signing in...")
              : (isAr ? "تسجيل الدخول" : "Sign In")}
          </button>
        </form>

        <a href={`/${locale}/login`} className="student-login-back">
          {isAr ? "← العودة لتسجيل دخول الإدارة" : "← Back to admin login"}
        </a>
      </div>
    </div>
  );
}
