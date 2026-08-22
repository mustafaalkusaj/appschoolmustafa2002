"use client";

import { useEffect } from "react";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getLocaleFromPath } from "@/lib/locale-routing";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);

  useEffect(() => {
    console.error("[LocaleError] Route error:", error?.message || error);
    console.error("[LocaleError] Stack:", error?.stack);
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error?.message || "Unknown",
        stack: error?.stack || "No stack",
        digest: error?.digest,
        pathname,
      }),
    }).catch(() => {});
  }, [error, pathname]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold mb-4">عذراً، حدث خطأ غير متوقع</h2>
      <p className="text-muted-foreground mb-6">لقد تم إرسال تقرير بالخطأ للفريق التقني.</p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} variant="default">
          إعادة المحاولة
        </Button>
        <Button onClick={() => { window.location.href = `/${locale}`; }} variant="outline">
          العودة للرئيسية
        </Button>
      </div>
      <pre dir="ltr" className="mt-8 max-w-2xl w-full text-start text-xs bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 p-4 rounded-lg overflow-auto whitespace-pre-wrap break-words">
        {error?.message || "Unknown error"}
        {error?.digest ? `\nDigest: ${error.digest}` : ""}
        {"\n\n"}
        {error?.stack || "No stack trace"}
      </pre>
    </div>
  );
}
