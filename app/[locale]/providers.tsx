"use client";
import { ThemeProvider } from "next-themes";
import { RoleProvider } from "@/hooks/useRole";
import { PlatformBrandingProvider } from "@/components/PlatformBrandingProvider";
import { SchoolBrandingProvider } from "@/components/SchoolBrandingProvider";
import type { PlatformBranding } from "@/lib/platform-branding";

export function Providers({
  children,
  initialPlatformBranding,
}: {
  children: React.ReactNode;
  initialPlatformBranding: PlatformBranding;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <PlatformBrandingProvider initialBranding={initialPlatformBranding}>
        <RoleProvider>
          <SchoolBrandingProvider>{children}</SchoolBrandingProvider>
        </RoleProvider>
      </PlatformBrandingProvider>
    </ThemeProvider>
  );
}
