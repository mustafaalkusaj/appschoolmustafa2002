"use client";

import { ThemeProvider } from "next-themes";
import { RuntimeBrandingProvider } from "@/hooks/brand";

export function ThemeProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <RuntimeBrandingProvider>{children}</RuntimeBrandingProvider>
    </ThemeProvider>
  );
}
