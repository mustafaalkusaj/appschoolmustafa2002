const featureEnv = process.env.NEXT_PUBLIC_FEATURES ?? "";

const enabledFeatures = new Set(
  featureEnv
    .split(",")
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean),
);

export function isFeatureEnabled(feature: string): boolean {
  return enabledFeatures.has(feature.toLowerCase());
}
