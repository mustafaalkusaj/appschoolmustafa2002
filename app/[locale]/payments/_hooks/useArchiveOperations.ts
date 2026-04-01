"use client";

import { useState, useCallback } from "react";
import { PaymentArchive } from "../_types";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

export function getPaymentMethodLabel(method: string, isEnglish: boolean = false) {
  return (
    {
      cash: isEnglish ? "Cash" : "نقداً",
      bank_transfer: isEnglish ? "Bank transfer" : "تحويل بنكي",
      check: isEnglish ? "Check" : "شيك",
    } as Record<string, string>
  )[method] || method;
}

export function getArchiveStudents(archive: PaymentArchive) {
  return Array.isArray(archive?.data?.students) ? archive.data.students : [];
}

export function getArchivePayments(archive: PaymentArchive) {
  return Array.isArray(archive?.data?.payments) ? archive.data.payments : [];
}

export function useArchiveOperations(
  resolvedSchoolId: string | null,
  canDeletePayments: boolean,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
) {
  const [archiveYear, setArchiveYear] = useState(new Date().getFullYear().toString());
  const [archiving, setArchiving] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<PaymentArchive | null>(null);
  const [showArchiveDetail, setShowArchiveDetail] = useState(false);
  const [archiveExportingId, setArchiveExportingId] = useState<string | null>(null);

  const archiveAccountsYear = useCallback(
    async (
      onArchiveUpdate: (archive: PaymentArchive, created: boolean) => void,
      onMetaRefresh: () => void
    ) => {
      if (!canDeletePayments) {
        onError?.("ليس لديك صلاحية أرشفة الحسابات.");
        return;
      }
      if (!resolvedSchoolId) {
        onError?.("لا يمكن تحديد المدرسة الحالية للأرشفة");
        return;
      }

      const year = parseInt(archiveYear, 10);
      if (!year) {
        onError?.("اختر سنة صحيحة للأرشفة");
        return;
      }

      setArchiving(true);
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          archive?: PaymentArchive;
          created?: boolean;
          error?: { message?: string };
        }>("/api/web/payments/archive", {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id: resolvedSchoolId,
            archive_year: year,
          }),
        });

        if (!response.ok) {
          onError?.(payload?.error?.message || "تعذر حفظ الأرشيف السنوي.");
          return;
        }

        if (payload?.archive) {
          onArchiveUpdate(payload.archive, payload?.created ?? false);
        }
        onSuccess?.(payload?.created ? "تم إنشاء الأرشيف السنوي للحسابات ✓" : "تم تحديث الأرشيف السنوي للحسابات ✓");
        onMetaRefresh();
      } catch (archiveError) {
        onError?.(archiveError instanceof Error ? archiveError.message : "تعذر حفظ الأرشيف السنوي.");
      } finally {
        setArchiving(false);
      }
    },
    [archiveYear, canDeletePayments, resolvedSchoolId, onError, onSuccess]
  );

  const openArchiveDetail = useCallback((archive: PaymentArchive) => {
    setSelectedArchive(archive);
    setShowArchiveDetail(true);
  }, []);

  const closeArchiveDetail = useCallback(() => {
    setShowArchiveDetail(false);
    setSelectedArchive(null);
  }, []);

  return {
    archiveYear,
    setArchiveYear,
    archiving,
    selectedArchive,
    showArchiveDetail,
    archiveExportingId,
    setArchiveExportingId,
    archiveAccountsYear,
    openArchiveDetail,
    closeArchiveDetail,
  };
}
