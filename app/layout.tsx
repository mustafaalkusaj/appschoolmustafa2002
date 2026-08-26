import type { Metadata } from "next";
import { Providers } from "@/app/[locale]/providers";
import { ToastProvider } from "@/components/toast";
import { WebPushRegistration } from "@/components/web-push-registration";
import { primaryFont } from "./fonts";
import { routing } from "@/i18n/routing";

// The root layout is shared by the `[locale]` tree and by the legacy non-locale
// redirect stubs, so it cannot read the `[locale]` param. It therefore declares
// the default locale server-side (WCAG 3.1.1 — the document must have a
// language on first paint and for non-JS / screen-reader consumers).
// `LocaleHtmlAttributes` corrects the document to `en`/`ltr` after hydration on
// English routes; this only changes what the FIRST paint declares.
const DEFAULT_LOCALE = routing.defaultLocale;
const DEFAULT_DIR = DEFAULT_LOCALE === "en" ? "ltr" : "rtl";

export const metadata: Metadata = {
  title: "School Management Platform",
  description: "School Management System",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "1024x1024" },
    ],
    apple: { url: "/icon.png", sizes: "1024x1024" },
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  other: {
    google: "notranslate",
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      dir={DEFAULT_DIR}
      suppressHydrationWarning
      translate="no"
      className={`notranslate ${primaryFont.variable}`}
    >
      <body
        className={`${primaryFont.className} antialiased notranslate`}
        translate="no"
      >
        <Providers>
          <ToastProvider>
            <WebPushRegistration />
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
