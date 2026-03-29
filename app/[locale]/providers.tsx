"use client";
import { ThemeProvider } from "next-themes";
import { LegacyLocaleBridge } from "@/components/LegacyLocaleBridge";
import { RuntimeBrandingProvider } from "@/hooks/brand";
import { RoleProvider } from "@/hooks/useRole";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <RoleProvider>
        <RuntimeBrandingProvider>
          <LegacyLocaleBridge />
          {children}
        </RuntimeBrandingProvider>
      </RoleProvider>
    </ThemeProvider>
  );
}
