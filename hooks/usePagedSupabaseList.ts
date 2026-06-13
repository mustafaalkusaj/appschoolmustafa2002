"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";

export type PagedFetchResult<T> = {
  data: T[] | null;
  count: number | null;
  error: PostgrestError | null;
};

export function usePagedSupabaseList<T>({
  enabled,
  page,
  pageSize,
  fetchPage,
  refreshKey = 0,
  cacheKey,
  ttlMs = 600_000,  // ✅ زيادة من 20 ثانية إلى 10 دقائق
}: {
  enabled: boolean;
  page: number;
  pageSize: number;
  fetchPage: (from: number, to: number) => Promise<PagedFetchResult<T>>;
  refreshKey?: number | string;
  cacheKey?: string;
  ttlMs?: number;
}) {
  const [rows, setRows] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequenceRef = useRef(0);

  const load = useCallback(async (options?: { bypassCache?: boolean; silent?: boolean }) => {
    const requestId = ++requestSequenceRef.current;
    if (!enabled) {
      setRows([]);
      setTotalCount(0);
      setLoading(false);
      setError(null);
      return;
    }
    if (!options?.silent) setLoading(true);
    setError(null);
    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;
    const cacheHandle = cacheKey ? `${cacheKey}::${refreshKey}::${page}::${pageSize}` : null;

    if (!options?.bypassCache && cacheHandle && typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem(cacheHandle);
        if (raw) {
          const cached = JSON.parse(raw) as {
            rows?: T[];
            totalCount?: number;
            cachedAt?: number;
          };
          if (
            Array.isArray(cached.rows) &&
            typeof cached.totalCount === "number" &&
            typeof cached.cachedAt === "number" &&
            Date.now() - cached.cachedAt <= ttlMs
          ) {
            if (requestId !== requestSequenceRef.current) return;
            setRows(cached.rows);
            setTotalCount(cached.totalCount);
            setError(null);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore cache read errors
      }
    }

    const { data, count, error: qErr } = await fetchPage(from, to);
    if (requestId !== requestSequenceRef.current) {
      return;
    }
    if (qErr) {
      setError(qErr.message);
      setRows([]);
      setTotalCount(0);
    } else {
      const nextRows = data ?? [];
      const nextCount = count ?? 0;
      setRows(nextRows);
      setTotalCount(nextCount);
      if (cacheHandle && typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(
            cacheHandle,
            JSON.stringify({
              rows: nextRows,
              totalCount: nextCount,
              cachedAt: Date.now(),
            }),
          );
        } catch {
          // ignore cache write errors
        }
      }
    }
    setLoading(false);
  }, [enabled, page, pageSize, fetchPage, refreshKey, cacheKey, ttlMs]);

  useEffect(() => {
    void load();
    return () => {
      requestSequenceRef.current += 1;
    };
  }, [load]);

  const reload = useCallback(async () => {
    await load({ bypassCache: true });
  }, [load]);

  const backgroundReload = useCallback(async () => {
    await load({ bypassCache: true, silent: true });
  }, [load]);

  const addItem = useCallback((item: T) => {
    setRows((prev) => [item, ...prev]);
    setTotalCount((prev) => prev + 1);
    if (cacheKey && typeof window !== "undefined") {
      const handle = `${cacheKey}::${refreshKey}::${page}::${pageSize}`;
      try { window.sessionStorage.removeItem(handle); } catch { /* ignore */ }
    }
  }, [cacheKey, refreshKey, page, pageSize]);

  const removeItem = useCallback((id: string) => {
    setRows((prev) => prev.filter((item) => (item as { id: string }).id !== id));
    setTotalCount((prev) => Math.max(0, prev - 1));
    if (cacheKey && typeof window !== "undefined") {
      const handle = `${cacheKey}::${refreshKey}::${page}::${pageSize}`;
      try { window.sessionStorage.removeItem(handle); } catch { /* ignore */ }
    }
  }, [cacheKey, refreshKey, page, pageSize]);

  const updateItem = useCallback((id: string, update: Partial<T>) => {
    setRows((prev) =>
      prev.map((item) =>
        (item as { id: string }).id === id ? { ...item, ...update } : item
      )
    );
    if (cacheKey && typeof window !== "undefined") {
      const handle = `${cacheKey}::${refreshKey}::${page}::${pageSize}`;
      try { window.sessionStorage.removeItem(handle); } catch { /* ignore */ }
    }
  }, [cacheKey, refreshKey, page, pageSize]);

  return { rows, totalCount, loading, error, reload, backgroundReload, addItem, removeItem, updateItem };
}
