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
}: {
  enabled: boolean;
  page: number;
  pageSize: number;
  fetchPage: (from: number, to: number) => Promise<PagedFetchResult<T>>;
  refreshKey?: number | string;
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
    const { data, count, error: qErr } = await fetchPage(from, to);
    if (qErr) {
      setError(qErr.message);
      setRows([]);
      setTotalCount(0);
    } else {
      setRows(data ?? []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [enabled, page, pageSize, fetchPage, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, totalCount, loading, error, reload: load };
}
