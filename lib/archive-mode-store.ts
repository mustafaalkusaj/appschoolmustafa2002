// Module-level archive mode store — no React, no serialization
// Dispatches a window event on change so React hooks can subscribe.

export type ArchiveModeStudent = {
  id: string;
  full_name: string;
  class_name: string;
  phone?: string;
  total_fee: number;
  paid_fee: number;
  remaining_fee: number;
  status?: string;
};

export type ArchiveModePayment = {
  id: string;
  student_id: string;
  amount: number;
  payment_method: string;
  notes?: string;
  receipt_number?: string;
  manual_receipt_number?: string;
  created_at: string;
};

export type ArchiveModeData = {
  archiveId: string;
  year: number;
  archiveDate: string;
  totalAmount: number;
  students: ArchiveModeStudent[];
  payments: ArchiveModePayment[];
};

export type ArchiveModeMeta = {
  id: string;
  year: number;
  archiveDate: string;
  totalStudents: number;
  totalPayments: number;
  totalAmount: number;
};

export const ARCHIVE_MODE_EVENT = "archive-mode-change";

let _current: ArchiveModeData | null = null;
let _available: ArchiveModeMeta[] = [];

export function getArchiveModeData(): ArchiveModeData | null {
  return _current;
}

export function getAvailableArchives(): ArchiveModeMeta[] {
  return _available;
}

export function setAvailableArchives(archives: ArchiveModeMeta[]): void {
  _available = archives;
}

export function setArchiveModeData(data: ArchiveModeData | null): void {
  _current = data;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ARCHIVE_MODE_EVENT));
  }
}
