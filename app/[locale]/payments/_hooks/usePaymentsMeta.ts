"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  PaymentsMetaState,
  EMPTY_SUMMARY,
  PaymentsSummary,
  PaymentArchive,
} from "../_types";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { deduplicatedFetch } from "@/lib/request-cache";

const paymentsMetaCache = new Map<string, PaymentsMetaState>();

export function usePaymentsMeta(resolvedSchoolId: string | null, currentBranchId?: string | null) {
  const [summary, setSummary] = useState<PaymentsSummary>(EMPTY_SUMMARY);
  const [classes, setClasses] = useState<string[]>([]);
  const [paymentYears, setPaymentYears] = useState<number[]>([]);
  const [totalPaymentCount, setTotalPaymentCount] = useState(0);
  const [archives, setArchives] = useState<PaymentArchive[]>([]);
  const [archiveNotice, setArchiveNotice] = useState("");
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMeta = useCallback(async () => {
    if (!resolvedSchoolId) return;

    const cacheKey = currentBranchId
      ? `payments-meta:${resolvedSchoolId}:${currentBranchId}`
      : `payments-meta:${resolvedSchoolId}`;
    const cached = paymentsMetaCache.get(cacheKey);
    if (cached) {
      setSummary(cached.summary);
      setClasses(cached.classOptions);
      setPaymentYears(cached.paymentYears);
      setTotalPaymentCount(cached.totalPaymentCount);
      setArchives(cached.archives);
      setArchiveNotice(cached.archiveNotice);
      setMetaLoading(false);
    } else {
      setMetaLoading(true);
    }

    try {
      const params = new URLSearchParams({
        schoolId: resolvedSchoolId,
      });
      if (currentBranchId) {
        params.set("branchId", currentBranchId);
      }

      const { response, payload } = await deduplicatedFetch(
        cacheKey,
        () => fetchJsonWithAuthorizedSession<{
          summary?: PaymentsSummary;
          classOptions?: string[];
          paymentYears?: number[];
          totalPaymentCount?: number;
          archives?: PaymentArchive[];
          archiveNotice?: string;
          error?: { message?: string };
        }>(`/api/web/payments/meta?${params.toString()}`)
      );

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل ملخص المدفوعات.");
      }

      const nextMeta = {
        summary: payload?.summary ?? EMPTY_SUMMARY,
        classOptions: payload?.classOptions ?? [],
        paymentYears: payload?.paymentYears ?? [],
        totalPaymentCount: typeof payload?.totalPaymentCount === "number" ? payload.totalPaymentCount : 0,
        archives: payload?.archives ?? [],
        archiveNotice: payload?.archiveNotice ?? "",
      } satisfies PaymentsMetaState;

      paymentsMetaCache.set(cacheKey, nextMeta);
      setSummary(nextMeta.summary);
      setClasses(nextMeta.classOptions);
      setPaymentYears(nextMeta.paymentYears);
      setTotalPaymentCount(nextMeta.totalPaymentCount);
      setArchives(nextMeta.archives);
      setArchiveNotice(nextMeta.archiveNotice);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل ملخص المدفوعات.");
    } finally {
      setMetaLoading(false);
    }
  }, [resolvedSchoolId, currentBranchId]);

  useEffect(() => {
    if (!resolvedSchoolId) return;
    void fetchMeta();
  }, [fetchMeta, resolvedSchoolId]);

  const refreshMeta = useCallback(() => {
    const cacheKey = currentBranchId
      ? `payments-meta:${resolvedSchoolId}:${currentBranchId}`
      : `payments-meta:${resolvedSchoolId}`;
    paymentsMetaCache.delete(cacheKey);
    void fetchMeta();
  }, [fetchMeta, resolvedSchoolId, currentBranchId]);

  const incrementPaymentCount = useCallback(() => {
    setTotalPaymentCount((current) => current + 1);
  }, []);

  const addPaymentYear = useCallback((year: number) => {
    setPaymentYears((current) =>
      current.includes(year) ? current : [year, ...current].sort((a, b) => b - a)
    );
  }, []);

  const updateArchives = useCallback((archive: PaymentArchive, _created: boolean) => {
    setArchives((current) => {
      const next = [archive, ...current.filter((a) => a.id !== archive.id)];
      return next.sort((left, right) => {
        const yearDiff = Number(right.archive_year ?? 0) - Number(left.archive_year ?? 0);
        if (yearDiff !== 0) return yearDiff;
        return new Date(String(right.archive_date ?? "")).getTime() - new Date(String(left.archive_date ?? "")).getTime();
      });
    });
  }, []);

  const decrementPaymentCount = useCallback(() => {
    setTotalPaymentCount((current) => Math.max(0, current - 1));
  }, []);

  return useMemo(() => ({
    summary,
    classes,
    paymentYears,
    totalPaymentCount,
    archives,
    archiveNotice,
    metaLoading,
    error,
    fetchMeta,
    refreshMeta,
    incrementPaymentCount,
    decrementPaymentCount,
    addPaymentYear,
    updateArchives,
    setError,
  }), [summary, classes, paymentYears, totalPaymentCount, archives, archiveNotice, metaLoading, error, fetchMeta, refreshMeta, incrementPaymentCount, decrementPaymentCount, addPaymentYear, updateArchives, setError]);
}
