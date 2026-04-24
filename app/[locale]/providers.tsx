"use client";
import dynamic from "next/dynamic";
import { RoleProvider } from "@/hooks/useRole";

const ThemeProviders = dynamic(
  () => import("./theme-providers").then((mod) => mod.ThemeProviders),
  { ssr: false },
);

export function Providers({ children }: { children: React.ReactNode }) {
  return <RoleProvider><ThemeProviders>{children}</ThemeProviders></RoleProvider>;
}
