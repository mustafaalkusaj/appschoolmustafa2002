import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import "./globals.css";
import { routing } from "@/i18n/routing";
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
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  
  // Enable static rendering
  setRequestLocale(locale);
  
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleHtmlAttributes />
      <div className="antialiased selection:bg-primary/10 selection:text-primary relative min-h-screen overflow-hidden bg-[var(--background)]" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
