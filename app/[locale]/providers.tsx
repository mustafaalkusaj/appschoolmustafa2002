"use client";
import dynamic from "next/dynamic";
import { RoleProvider } from "@/hooks/useRole";

const ThemeProviders = dynamic(
  () => import("./theme-providers").then((mod) => mod.ThemeProviders).catch((err) => {
    console.error("[Providers] Failed to load ThemeProviders:", err);
    throw err;
  }),
  { ssr: false },
);

export function Providers({ children }: { children: React.ReactNode }) {
  return <RoleProvider><ThemeProviders>{children}</ThemeProviders></RoleProvider>;
}
