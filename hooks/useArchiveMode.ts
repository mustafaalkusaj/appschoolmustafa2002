"use client";

import { useCallback, useEffect, useState } from "react";

export interface ArchiveStudent {
  id: string;
  [key: string]: unknown;
}

export interface ArchivePayment {
  id: string;
  [key: string]: unknown;
}

export interface ArchiveData {
  archiveId: string;
  year: number | string;
  archiveDate: string;
  totalAmount: number;
  students: ArchiveStudent[];
  payments: ArchivePayment[];
}

const STORAGE_KEY = "archiveMode.v1";
const EVENT_NAME = "archiveMode:changed";

function readState(): ArchiveData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ArchiveData;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeState(value: ArchiveData | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // swallow quota / privacy-mode errors
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export interface UseArchiveModeReturn {
  isArchiveMode: boolean;
  archiveData: ArchiveData | null;
  enterArchiveMode: (data: ArchiveData) => void;
  exitArchiveMode: () => void;
}

export function useArchiveMode(): UseArchiveModeReturn {
  const [data, setData] = useState<ArchiveData | null>(() => readState());

  useEffect(() => {
    const handler = () => setData(readState());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const enterArchiveMode = useCallback((value: ArchiveData) => {
    writeState(value);
  }, []);

  const exitArchiveMode = useCallback(() => {
    writeState(null);
  }, []);

  return {
    isArchiveMode: data !== null,
    archiveData: data,
    enterArchiveMode,
    exitArchiveMode,
  };
}
