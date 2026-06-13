"use client";

import { useRuntimeBranding } from "@/hooks/brand/useRuntimeBranding";

const CURRENCY_SYMBOLS: Record<string, string> = {
  IQD: "د.ع",
  USD: "$",
  SAR: "ر.س",
  AED: "د.إ",
};

/** Returns the currency symbol for the current branch/school. */
export function useCurrency(): string {
  const { currency } = useRuntimeBranding();
  if (!currency) return "د.ع";
  // If stored as code (IQD/USD/SAR/AED), convert to symbol
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

/** No-op — kept for backward compatibility. Cache is cleared on branding refresh. */
export function invalidateCurrencyCache() {}
