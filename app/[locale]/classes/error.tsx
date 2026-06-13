"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function ClassesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <ErrorState
        title="حدث خطأ في صفحة الصفوف"
        description="يرجى المحاولة مرة أخرى"
        onRetry={reset}
        retryLabel="إعادة المحاولة"
      />
    </div>
  );
}
