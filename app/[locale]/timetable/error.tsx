"use client";

import { FeatureErrorFallback } from "@/components/ui/feature-error-fallback";

export default function TimetableError({ reset }: { reset: () => void }) {
  return <FeatureErrorFallback reset={reset} />;
}
