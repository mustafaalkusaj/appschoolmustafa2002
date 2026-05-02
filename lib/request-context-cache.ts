import { AsyncLocalStorage } from "async_hooks";
import type { SchoolScopedActorContext } from "@/lib/managed-users/types";

// Request-scoped storage. Safe: each request gets isolated AsyncLocalStorage.
// NO data leakage between requests or users.
const requestContextStore = new AsyncLocalStorage<{
  contexts: Map<string, { ok: true; value: SchoolScopedActorContext } | { ok: false; status: number; message: string }>;
  timings: Map<string, number>; // label -> durationMs
  callCounts: Map<string, number>; // label -> count
}>();

export function initializeRequestContextCache() {
  const store = {
    contexts: new Map(),
    timings: new Map(),
    callCounts: new Map(),
  };
  return requestContextStore.run(store, () => store);
}

export async function runWithRequestContextCache<T>(
  callback: () => Promise<T>,
): Promise<T> {
  const store = {
    contexts: new Map(),
    timings: new Map(),
    callCounts: new Map(),
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
  const cached = store.contexts.get(key);
  if (cached) {
    const label = "auth_cache_hit";
    store.callCounts.set(label, (store.callCounts.get(label) ?? 0) + 1);
  }
  return cached || null;
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

  // Sum multiple calls to same label
  store.timings.set(label, (store.timings.get(label) ?? 0) + durationMs);
  store.callCounts.set(label, (store.callCounts.get(label) ?? 0) + 1);
}

export function getTimings(): Record<string, { durationMs: number; callCount: number }> {
  const store = requestContextStore.getStore();
  if (!store) return {};

  const result: Record<string, { durationMs: number; callCount: number }> = {};
  store.timings.forEach((durationMs, key) => {
    result[key] = {
      durationMs: Math.round(durationMs),
      callCount: store.callCounts.get(key) ?? 1,
    };
  });
  return result;
}
