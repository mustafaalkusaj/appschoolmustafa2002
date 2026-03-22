import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { APP_LOCALE } from "@/lib/locale-routing";
import { SCHOOL_BRAND } from "@/lib/branding";

export const metadata: Metadata = {
  title: SCHOOL_BRAND.nameAr,
  description: `${SCHOOL_BRAND.nameAr} - ${SCHOOL_BRAND.subtitleAr}`,
};

export function generateStaticParams() {
  return [{ locale: APP_LOCALE }];
}

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = (await import("@/messages/ar.json")).default;

  return (
    <NextIntlClientProvider locale={APP_LOCALE} messages={messages}>
      <div className="antialiased">{children}</div>
    </NextIntlClientProvider>
  );
}
