import { AsyncLocalStorage } from "async_hooks";
import type { SchoolScopedActorContext } from "@/lib/managed-users/types";

// Request-scoped storage. Safe: each request gets isolated AsyncLocalStorage.
// NO data leakage between requests or users.
const requestContextStore = new AsyncLocalStorage<{
  contexts: Map<string, { ok: true; value: SchoolScopedActorContext } | { ok: false; status: number; message: string }>;
  timings: Map<string, { start: number; end?: number }>;
}>();

export function initializeRequestContextCache() {
  const store = {
    contexts: new Map(),
    timings: new Map(),
  };
  return requestContextStore.run(store, () => store);
}

export async function runWithRequestContextCache<T>(
  callback: () => Promise<T>,
): Promise<T> {
  const store = {
    contexts: new Map(),
    timings: new Map(),
  };
  return requestContextStore.run(store, callback);
}

export function getCachedSchoolContext(
  userId: string,
  schoolId: string | null,
): { ok: true; value: SchoolScopedActorContext } | { ok: false; status: number; message: string } | null {
  const store = requestContextStore.getStore();
  if (!store) return null;

  const key = `${userId}:${schoolId || "null"}`;
  return store.contexts.get(key) || null;
}

export function setCachedSchoolContext(
  userId: string,
  schoolId: string | null,
  context: { ok: true; value: SchoolScopedActorContext } | { ok: false; status: number; message: string },
): void {
  const store = requestContextStore.getStore();
  if (!store) return;

  const key = `${userId}:${schoolId || "null"}`;
  store.contexts.set(key, context);
}

export function recordTiming(label: string, durationMs: number): void {
  const store = requestContextStore.getStore();
  if (!store) return;

  const now = performance.now();
  store.timings.set(label, { start: now - durationMs, end: now });
}

export function getTimings(): Record<string, { start: number; end: number; durationMs: number }> {
  const store = requestContextStore.getStore();
  if (!store) return {};

  const result: Record<string, { start: number; end: number; durationMs: number }> = {};
  for (const [key, timing] of store.timings) {
    if (timing.end !== undefined) {
      result[key] = {
        start: timing.start,
        end: timing.end,
        durationMs: Math.round(timing.end - timing.start),
      };
    }
  }
  return result;
}
