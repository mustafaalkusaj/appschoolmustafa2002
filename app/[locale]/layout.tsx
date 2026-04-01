import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { APP_LOCALE, LEGACY_LOCALE, normalizeLocale } from "@/lib/locale-routing";
import { SCHOOL_BRAND } from "@/lib/branding";
import { LocaleHtmlAttributes } from "@/components/LocaleHtmlAttributes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === "en";
  return {
    title: isEnglish ? SCHOOL_BRAND.nameEn : SCHOOL_BRAND.nameAr,
    description: isEnglish
      ? `${SCHOOL_BRAND.nameEn} - ${SCHOOL_BRAND.subtitleEn}`
      : `${SCHOOL_BRAND.nameAr} - ${SCHOOL_BRAND.subtitleAr}`,
  };
}

export function generateStaticParams() {
  return [{ locale: APP_LOCALE }, { locale: LEGACY_LOCALE }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: requestedLocale } = await params;
  const locale = normalizeLocale(requestedLocale);
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleHtmlAttributes />
      <div className="antialiased" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
