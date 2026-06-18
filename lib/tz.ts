/**
 * Timezone utilities for Baghdad / Asia/Baghdad (UTC+3, no DST).
 *
 * Vercel reserves the TZ env var and cannot be set via environment.
 * All subscription-expiry and date calculations that should be in Baghdad
 * time must use these helpers instead of setHours() which uses server local
 * time (UTC on Vercel serverless).
 */

/** Baghdad is always UTC+3 — no daylight saving time observed in Iraq. */
const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Appends the Baghdad UTC+3 offset to a timezone-naive datetime string.
 *
 * `<input type="datetime-local">` produces strings like "2026-06-17T09:00"
 * with no timezone info. When inserted into a `timestamptz` column, Postgres
 * treats them as UTC, causing a 3-hour shift. This helper appends "+03:00"
 * so Postgres stores the intended Baghdad local time correctly.
 *
 * Already-qualified strings (containing '+', '-' offset, or 'Z') pass through
 * unchanged.
 */
export function toBaghdadTimestamp(dt: string | null | undefined): string | null {
  if (!dt) return null;
  // Already has timezone info — leave it alone
  if (/[Zz]$/.test(dt) || /[+-]\d{2}:\d{2}$/.test(dt)) return dt;
  // Ensure seconds component for ISO 8601 compliance
  const normalized = dt.length === 16 ? `${dt}:00` : dt; // "2026-06-17T09:00" → "2026-06-17T09:00:00"
  return `${normalized}+03:00`;
}

/**
 * Returns the end of day (23:59:59.999) for the given date interpreted
 * in Baghdad local time, expressed as a UTC Date.
 *
 * Example: date = 2026-04-30T00:00:00Z
 *   → Baghdad date = 2026-04-30 (03:00 Baghdad)
 *   → end of that Baghdad day = 2026-04-30T23:59:59.999+03:00
 *   → UTC = 2026-04-30T20:59:59.999Z
 */
export function endOfDayBaghdad(date: Date): Date {
  // Shift the UTC timestamp into Baghdad local time
  const baghdadLocal = new Date(date.getTime() + BAGHDAD_OFFSET_MS);
  // Extract the Baghdad calendar date (stored as UTC fields after the shift)
  const y = baghdadLocal.getUTCFullYear();
  const m = baghdadLocal.getUTCMonth();
  const d = baghdadLocal.getUTCDate();
  // End of that Baghdad day expressed back in UTC: Baghdad 23:59:59 = UTC 20:59:59
  return new Date(Date.UTC(y, m, d, 20, 59, 59, 999));
}
