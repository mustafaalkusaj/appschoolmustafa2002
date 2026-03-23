import type { Metadata } from "next";
import { Cairo, Space_Grotesk } from "next/font/google";

import { AppProviders } from "@/app/providers";
import { DEFAULT_LANGUAGE, getDirection, getTranslations, languageBootstrapScript } from "@/lib/i18n";

import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const defaultTranslations = getTranslations(DEFAULT_LANGUAGE);

export const metadata: Metadata = {
  title: defaultTranslations.metadata.title,
  description: defaultTranslations.metadata.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={DEFAULT_LANGUAGE}
      dir={getDirection(DEFAULT_LANGUAGE)}
      suppressHydrationWarning
      className={`${cairo.variable} ${spaceGrotesk.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: languageBootstrapScript() }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
