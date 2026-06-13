export const JOB_TITLE_MAX_LENGTH = 120;

export function normalizeJobTitle(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, JOB_TITLE_MAX_LENGTH);
}
