"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
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
    Sentry.captureException(error);
  }, [error]);

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
    </div>
  );
}
