"use client";

// Teachers page UI components

import { MANAGED_USER_ROLE_LABELS, type ManagedUserRole } from "@/lib/managed-users";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-bold text-[var(--danger)]">{message}</p>;
}

export function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`ui-pill ${active ? "ui-pill--success" : "ui-pill--danger"}`}>
      {active ? "نشط" : "غير نشط"}
    </span>
  );
}

export function RolePill({ role }: { role: ManagedUserRole }) {
  const toneClass =
    role === "student"
      ? "bg-[var(--surface-soft)] text-[var(--text-primary)]"
      : "ui-pill--warning";

  return <span className={`ui-pill ${toneClass}`}>{MANAGED_USER_ROLE_LABELS[role]}</span>;
}
