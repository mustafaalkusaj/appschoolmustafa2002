import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Cairo, Manrope } from "next/font/google";
import { Providers } from "@/app/[locale]/providers";
import { ToastProvider } from "@/components/toast";
import { readPlatformBrandingFromDatabase } from "@/lib/platform-branding-server";
import {
  getLocaleDirection,
  normalizeLocale,
} from "@/lib/locale-routing";
import {
  getPlatformBrandBrowserTitle,
  getPlatformBrandIconUrl,
  getPlatformBrandShortName,
  getPlatformBrandSubtitle,
} from "@/lib/platform-branding";
import { resolveBrandingTheme } from "@/lib/branding-theme";
import { buildThemeCssText } from "@/lib/theme-system";
import { getServerResolvedPublicSupabaseConfig } from "@/lib/supabase-config";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  weight: ["400", "600", "700", "800", "900"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-app-locale"));
  const { branding } = await readPlatformBrandingFromDatabase();
  const title = getPlatformBrandBrowserTitle(branding, locale);
  const description = `${title} - ${getPlatformBrandSubtitle(branding, locale)}`;
  const iconUrl = getPlatformBrandIconUrl(branding);
  const shortName = getPlatformBrandShortName(branding, locale);

  return {
    title,
    description,
    applicationName: shortName,
    manifest: "/manifest.webmanifest",
    icons: iconUrl
      ? {
          icon: [{ url: iconUrl }],
          shortcut: [{ url: iconUrl }],
          apple: [{ url: iconUrl }],
        }
      : undefined,
    appleWebApp: {
      capable: true,
      title: shortName,
      statusBarStyle: "default",
    },
    openGraph: {
      title,
      description,
    },
    other: {
      google: "notranslate",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { branding } = await readPlatformBrandingFromDatabase();

  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: branding.theme.light.brand.primary },
      { media: "(prefers-color-scheme: dark)", color: branding.theme.dark.brand.primary },
    ],
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const locale = normalizeLocale(headerList.get("x-app-locale"));
  const direction = getLocaleDirection(locale);
  const { branding: platformBranding } = await readPlatformBrandingFromDatabase();
  const platformThemeCssText = buildThemeCssText(resolveBrandingTheme({ platformBranding }).tokens);
  const runtimePublicEnv = getServerResolvedPublicSupabaseConfig();
  const runtimeEnvScript = `window.__SCHOOL_APP_PUBLIC_ENV__=${JSON.stringify(runtimePublicEnv).replace(/</g, "\\u003c")};`;

  return (
    <html
      lang={locale}
      dir={direction}
      suppressHydrationWarning
      translate="no"
      className={`notranslate ${cairo.variable} ${manrope.variable}`}
    >
      <body className="notranslate" translate="no">
        <script dangerouslySetInnerHTML={{ __html: runtimeEnvScript }} />
        <style id="platform-theme-vars" dangerouslySetInnerHTML={{ __html: platformThemeCssText }} />
        <Providers initialPlatformBranding={platformBranding}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
