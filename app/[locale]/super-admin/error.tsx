"use client";

import { useEffect } from "react";
import { FeatureErrorFallback } from "@/components/ui/feature-error-fallback";

export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void error;
  }, [error]);

  return <FeatureErrorFallback reset={reset} />;
}
