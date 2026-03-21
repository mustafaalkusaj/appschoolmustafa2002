export const APP_LOCALE = "ar" as const;
export const LEGACY_LOCALE = "en" as const;

export type AppLocale = typeof APP_LOCALE;
export type LocalePrefix = typeof APP_LOCALE | typeof LEGACY_LOCALE;

const KNOWN_LOCALES = new Set<LocalePrefix>([APP_LOCALE, LEGACY_LOCALE]);

export function normalizeLocale(input: string | null | undefined): AppLocale {
  void input;
  return APP_LOCALE;
}

export function getLocaleFromPath(pathname: string | null | undefined): AppLocale {
  if (!pathname) return APP_LOCALE;
  return APP_LOCALE;
}

export function hasLocalePrefix(pathname: string): boolean {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return Boolean(firstSegment && KNOWN_LOCALES.has(firstSegment as LocalePrefix));
}

export function stripLocaleFromPath(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length > 0 && KNOWN_LOCALES.has(parts[0] as LocalePrefix)) {
    const rest = parts.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return normalized;
}

export function localizeAppPath(pathname: string, locale: string = APP_LOCALE): string {
  const stripped = stripLocaleFromPath(pathname || "/");
  const normalized = stripped === "/" ? "" : stripped;
  return `/${normalizeLocale(locale)}${normalized}`;
}

export function sanitizeNextPath(nextPath: string | null | undefined): string | null {
  if (!nextPath || typeof nextPath !== "string") return null;
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return null;
  return nextPath;
}
