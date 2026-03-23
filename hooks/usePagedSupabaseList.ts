"use client";

import { useCallback, useEffect, useState } from "react";
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
  ttlMs = 20_000,
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

  const load = useCallback(async () => {
    void refreshKey;
    if (!enabled) {
      setRows([]);
      setTotalCount(0);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;
    const cacheHandle = cacheKey ? `${cacheKey}::${page}::${pageSize}` : null;

    if (cacheHandle && typeof window !== "undefined") {
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
            setRows(cached.rows);
            setTotalCount(cached.totalCount);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore cache read errors
      }
    }

    const { data, count, error: qErr } = await fetchPage(from, to);
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
        window.sessionStorage.setItem(
          cacheHandle,
          JSON.stringify({
            rows: nextRows,
            totalCount: nextCount,
            cachedAt: Date.now(),
          }),
        );
      }
    }
    setLoading(false);
  }, [enabled, page, pageSize, fetchPage, refreshKey, cacheKey, ttlMs]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, totalCount, loading, error, reload: load };
}
