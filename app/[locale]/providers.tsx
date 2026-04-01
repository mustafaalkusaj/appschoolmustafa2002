"use client";
import { ThemeProvider } from "next-themes";
import { RuntimeBrandingProvider } from "@/hooks/brand";
import { RoleProvider } from "@/hooks/useRole";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      <RoleProvider>
        <RuntimeBrandingProvider>
          {children}
        </RuntimeBrandingProvider>
      </RoleProvider>
    </ThemeProvider>
  );
}
