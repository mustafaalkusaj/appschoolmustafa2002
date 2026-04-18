"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { FeatureErrorFallback } from "@/components/ui/feature-error-fallback";

export default function AttendanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <FeatureErrorFallback reset={reset} />;
}
