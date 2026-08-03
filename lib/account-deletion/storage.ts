import { SUBJECT_STORAGE_BUCKETS } from "@/lib/account-deletion/policy";
import type { StorageObjectRef } from "@/lib/account-deletion/types";

/**
 * Pull the object path out of whatever we stored in the DB. Photo/attachment
 * columns hold one of three shapes across the codebase's history:
 *   - a Supabase public URL   .../storage/v1/object/public/<bucket>/<path>
 *   - a protected proxy URL   .../api/web/storage/<bucket>/<path>
 *   - a bare object path      <path>
 * Returns null when the value clearly belongs to a different bucket.
 */
export function extractStoragePath(
  value: string | null | undefined,
  bucket: string,
): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const marker = `/${bucket}/`;
  const index = trimmed.indexOf(marker);
  if (index >= 0) {
    const path = trimmed.slice(index + marker.length).split("?")[0];
    return decodeURIComponent(path) || null;
  }

  // A bare path — only usable if it isn't some other absolute URL.
  if (/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/^\/+/, "") || null;
}

/** Prefixes under which a subject's own objects are stored, per bucket. */
export function buildSubjectPrefixes(input: {
  schoolId: string;
  authUserId: string | null;
  studentId: string | null;
  teacherId: string | null;
}): string[] {
  const ids = [input.authUserId, input.studentId, input.teacherId].filter(
    (id): id is string => Boolean(id),
  );

  const prefixes = new Set<string>();
  for (const id of ids) {
    prefixes.add(id);
    prefixes.add(`${input.schoolId}/${id}`);
  }
  return Array.from(prefixes);
}

export function dedupeStorageRefs(
  refs: StorageObjectRef[],
): StorageObjectRef[] {
  const seen = new Set<string>();
  const out: StorageObjectRef[] = [];
  for (const ref of refs) {
    if (!ref.path) continue;
    const key = `${ref.bucket}::${ref.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

export const STORAGE_BUCKETS_TO_SWEEP = SUBJECT_STORAGE_BUCKETS;
