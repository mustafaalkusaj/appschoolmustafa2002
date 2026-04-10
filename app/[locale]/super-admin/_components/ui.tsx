"use client";

import { Plus, AlertTriangle, X, type LucideIcon } from "@/lib/icons";
import { createTintSurface } from "./utils";

export function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="ui-surface rounded-[32px] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-[var(--text-primary)]">{title}</h2>
          {description ? (
            <p className="text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  meta,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  meta: string;
  tint: string;
}) {
  return (
    <div className="ui-surface relative overflow-hidden rounded-[28px] p-5">
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-bold text-[var(--text-secondary)]">{label}</p>
          <div className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{value}</div>
          <p className="text-xs font-bold text-[var(--text-secondary)]">{meta}</p>
        </div>
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-[18px]"
          style={{ background: createTintSurface(tint, 14), color: tint }}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-6 py-10 text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-[rgba(79,140,255,0.12)] text-[var(--primary)]">
        <Icon size={24} />
      </div>
      <h3 className="mb-2 text-lg font-black text-[var(--text-primary)]">{title}</h3>
      <p className="max-w-md text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          className="ui-button ui-button--primary mt-5 inline-flex items-center gap-2"
          onClick={onAction}
        >
          <Plus size={16} />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ModalFrame({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="ui-backdrop flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ui-dialog w-full max-w-[720px] overflow-hidden" role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-7">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--text-primary)]">{title}</h2>
            {subtitle ? <p className="text-sm leading-7 text-[var(--text-secondary)]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function MigrationNotice({
  title = "يتطلب تشغيل migration",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-[rgba(242,169,59,0.28)] bg-[rgba(242,169,59,0.10)] p-5">
      <div className="mb-3 flex items-center gap-3 text-[var(--warning)]">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] bg-[rgba(242,169,59,0.16)]">
          <AlertTriangle size={18} />
        </div>
        <div>
          <h3 className="text-sm font-black text-[var(--text-primary)]">{title}</h3>
          <p className="text-xs font-bold text-[var(--text-secondary)]">admin_infrastructure.sql</p>
        </div>
      </div>
      <p className="text-sm font-semibold leading-7 text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
