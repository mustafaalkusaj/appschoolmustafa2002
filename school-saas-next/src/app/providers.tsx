"use client";

import type { PropsWithChildren } from "react";

import { AppDataProvider } from "@/providers/app-data-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppDataProvider>{children}</AppDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
