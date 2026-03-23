"use client";
import { ThemeProvider } from "next-themes";
import { LegacyLocaleBridge } from "@/components/LegacyLocaleBridge";
import { RoleProvider } from "@/hooks/useRole";
import { RuntimeBrandingProvider } from "@/hooks/useRuntimeBranding";

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
