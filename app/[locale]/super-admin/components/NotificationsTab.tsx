"use client";

import { Bell } from "@/lib/icons";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";

interface NotificationsTabProps {
  infrastructure: AdminInfrastructure;
}

export function NotificationsTab({ infrastructure: _infrastructure }: NotificationsTabProps) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-12 shadow-[var(--card-shadow)] flex flex-col items-center justify-center gap-4 text-center">
      <div className="h-16 w-16 rounded-full bg-[var(--surface-muted)] flex items-center justify-center">
        <Bell size={28} className="text-[var(--text-muted)]" />
      </div>
      <h2 className="text-lg font-black text-[var(--text-primary)]">الإشعارات — قريباً</h2>
      <p className="text-sm text-[var(--text-secondary)] max-w-sm">
        إدارة إشعارات المدارس وإرسال الإشعارات الجماعية ستكون متاحة قريباً.
      </p>
    </div>
  );
}
