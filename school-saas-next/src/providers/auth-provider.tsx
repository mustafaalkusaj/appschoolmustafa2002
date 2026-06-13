"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type { AuthErrorCode, SessionUser } from "@/lib/types";

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  loginAs: (userId: string) => Promise<{ ok: boolean; code?: AuthErrorCode }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
      const payload = (await response.json()) as { user: SessionUser | null };
      setUser(payload.user ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginAs = useCallback(async (userId: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const payload = (await response.json()) as { user?: SessionUser; code?: AuthErrorCode };
    if (!response.ok || !payload.user) {
      return { ok: false, code: payload.code ?? "login_failed" };
    }

    setUser(payload.user);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      loginAs,
      logout,
      refresh,
    }),
    [isLoading, loginAs, logout, refresh, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }

  return context;
}
