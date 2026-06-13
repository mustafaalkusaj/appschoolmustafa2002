const SAFE_IMAGE_PROTOCOLS = new Set(["http:", "https:", "data:", "blob:"]);

export function sanitizeImageUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!SAFE_IMAGE_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
