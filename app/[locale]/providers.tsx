"use client";
import { ThemeProvider } from "next-themes";
import { RoleProvider } from "@/hooks/useRole";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <RoleProvider>{children}</RoleProvider>
    </ThemeProvider>
  );
}
