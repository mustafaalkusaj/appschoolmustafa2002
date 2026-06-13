"use client";

import { useEffect, useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDaysRemaining, getAuthErrorMessage, getRoleLabel } from "@/lib/i18n";
import { daysUntil } from "@/lib/saas";
import type { AuthErrorCode, SessionUser } from "@/lib/types";

type DemoUser = SessionUser & { schoolName: string | null };

export function LoginCard() {
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const { loginAs } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      const response = await fetch("/api/auth/demo-users", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok || !mounted) {
        return;
      }

      const payload = (await response.json()) as { users: DemoUser[] };
      setDemoUsers(payload.users);
    };

    void loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async (userId: string) => {
    setLoadingUserId(userId);
    setError(null);

    const response = await loginAs(userId);
    setLoadingUserId(null);

    if (!response.ok) {
      setError(response.code ?? "login_failed");
      return;
    }

    const selected = demoUsers.find((entry) => entry.id === userId);
    if (!selected) {
      return;
    }

    if (selected.role === "super_admin") {
      router.push("/super-admin");
    } else {
      router.push("/portal");
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.2),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_40%)]" />
      <section className="relative z-10 w-full max-w-5xl rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t.login.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t.login.subtitle}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
            {getAuthErrorMessage(error, language)}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {demoUsers.map((user) => {
            const daysLeft = user.subscriptionExpiresAt ? daysUntil(user.subscriptionExpiresAt) : null;
            return (
              <article
                key={user.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  <p className="text-xs text-sky-700 dark:text-sky-300">{getRoleLabel(user.role, language)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.login.schoolLabel}: {user.schoolName ?? t.common.globalScope}
                  </p>
                  {daysLeft !== null && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.login.subscriptionLabel}: {formatDaysRemaining(daysLeft, language)}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={loadingUserId === user.id}
                  onClick={() => handleLogin(user.id)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingUserId === user.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.login.signingIn}
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      {t.login.signIn}
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
