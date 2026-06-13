import { DEFAULT_LANGUAGE, getLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function getRenderReferenceDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0));
}

export function shiftReferenceDate(days: number, reference = getRenderReferenceDate()): string {
  const date = new Date(reference);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function daysUntil(date: string, reference = getRenderReferenceDate()): number {
  const target = new Date(date);
  const referenceDay = Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    reference.getUTCDate(),
  );
  const targetDay = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());

  return Math.ceil((targetDay - referenceDay) / DAY_IN_MS);
}

export function formatUtcDate(date: string, language: Language = DEFAULT_LANGUAGE): string {
  return new Intl.DateTimeFormat(getLocale(language), {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function formatUtcDateTime(date: string, language: Language = DEFAULT_LANGUAGE): string {
  return new Intl.DateTimeFormat(getLocale(language), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function buildRecentMonths(
  total: number,
  language: Language = DEFAULT_LANGUAGE,
  reference = getRenderReferenceDate(),
) {
  const entries: Array<{ key: string; label: string }> = [];
  const monthFormatter = new Intl.DateTimeFormat(getLocale(language), {
    month: "short",
    timeZone: "UTC",
  });

  for (let index = total - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = monthFormatter.format(date);
    entries.push({ key, label });
  }

  return entries;
}
