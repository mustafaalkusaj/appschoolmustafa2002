import type { Metadata } from "next";
import { Providers } from "@/app/[locale]/providers";
import { ToastProvider } from "@/components/toast";
import { SCHOOL_BRAND } from "@/lib/branding";

export const metadata: Metadata = {
  title: SCHOOL_BRAND.nameAr,
  description: `${SCHOOL_BRAND.nameAr} - ${SCHOOL_BRAND.subtitleAr}`,
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
    <html lang="ar" dir="rtl" suppressHydrationWarning translate="no" className="notranslate">
      <body className="notranslate" translate="no">
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
