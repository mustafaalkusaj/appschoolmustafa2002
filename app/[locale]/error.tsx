"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
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
        <Button onClick={() => window.location.href = "/"} variant="outline">
          العودة للرئيسية
        </Button>
      </div>
    </div>
  );
}
