import type { Metadata } from "next";
import { Providers } from "@/app/[locale]/providers";
import { ToastProvider } from "@/components/toast";
import { primaryFont } from "./fonts";

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
    <html suppressHydrationWarning translate="no" className={`notranslate ${primaryFont.variable}`}>
      <body className={`${primaryFont.className} antialiased notranslate`} translate="no">
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
