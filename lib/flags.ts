import { supabase } from "./supabase";

export async function isFeatureEnabled(key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("is_enabled")
      .eq("key", key)
      .maybeSingle();

    if (error || !data) return false;
    return data.is_enabled;
  } catch (err) {
    console.error(`Error checking feature flag ${key}:`, err);
    return false;
  }
}

export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, is_enabled");

    if (error || !data) return {};
    return data.reduce((acc, curr) => ({
      ...acc,
      [curr.key]: curr.is_enabled
    }), {});
  } catch (err) {
    console.error("Error fetching feature flags:", err);
    return {};
  }
}
