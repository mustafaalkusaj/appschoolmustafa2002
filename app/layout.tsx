import type { Metadata } from "next";
import { Providers } from "@/app/[locale]/providers";
import { ToastProvider } from "@/components/toast";

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
