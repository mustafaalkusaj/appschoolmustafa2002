import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import { Providers } from "@/app/[locale]/providers";
import { ToastProvider } from "@/components/toast";

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-noto-sans-arabic",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "School Management Platform",
  description: "School Management System",
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
    <html suppressHydrationWarning translate="no" className="notranslate">
      <body className={`${notoSansArabic.variable} notranslate`} translate="no">
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
