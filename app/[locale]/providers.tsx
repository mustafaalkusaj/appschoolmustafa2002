"use client";
import { RoleProvider } from "@/hooks/useRole";
import { ThemeProviders } from "./theme-providers";

export function Providers({ children }: { children: React.ReactNode }) {
  return <RoleProvider><ThemeProviders>{children}</ThemeProviders></RoleProvider>;
}
