"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getArchiveModeData,
  setArchiveModeData,
  getAvailableArchives,
  setAvailableArchives,
  ARCHIVE_MODE_EVENT,
  type ArchiveModeData,
  type ArchiveModeMeta,
} from "@/lib/archive-mode-store";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

export function useArchiveMode() {
  const [data, setData] = useState<ArchiveModeData | null>(() => getArchiveModeData());
  const [available, setAvailable] = useState<ArchiveModeMeta[]>(() => getAvailableArchives());
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const sync = () => {
      setData(getArchiveModeData());
      setAvailable(getAvailableArchives());
    };
    window.addEventListener(ARCHIVE_MODE_EVENT, sync);
    return () => window.removeEventListener(ARCHIVE_MODE_EVENT, sync);
  }, []);

  const exitArchiveMode = useCallback(() => {
    setArchiveModeData(null);
  }, []);

  const switchToArchive = useCallback(async (meta: ArchiveModeMeta, schoolId: string) => {
    setSwitching(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        archive?: {
          id: string;
          archive_year: number;
          archive_date: string;
          total_amount?: number;
          data?: {
            students?: ArchiveModeData["students"];
            payments?: ArchiveModeData["payments"];
          };
        };
      }>(`/api/web/payments/archive?archiveId=${meta.id}&schoolId=${schoolId}`);
      if (!response.ok) return;
      const arc = payload?.archive;
      if (!arc) return;
      setArchiveModeData({
        archiveId: arc.id,
        year: arc.archive_year,
        archiveDate: arc.archive_date,
        totalAmount: arc.total_amount ?? meta.totalAmount,
        students: arc.data?.students ?? [],
        payments: arc.data?.payments ?? [],
      });
    } finally {
      setSwitching(false);
    }
  }, []);

  return {
    isArchiveMode: data !== null,
    archiveData: data,
    archiveYear: data?.year ?? null,
    availableArchives: available,
    switching,
    exitArchiveMode,
    switchToArchive,
    setAvailableArchives,
  };
}
