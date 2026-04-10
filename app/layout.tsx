import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { Providers } from "@/app/[locale]/providers";
import { ToastProvider } from "@/components/toast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
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
      <body className={`${inter.variable} ${cairo.variable} notranslate`} translate="no">
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
