"use client";

import { FeatureErrorFallback } from "@/components/ui/feature-error-fallback";

export default function SettingsError({ reset }: { reset: () => void }) {
  return <FeatureErrorFallback reset={reset} />;
}
