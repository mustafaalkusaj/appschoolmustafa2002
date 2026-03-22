import { AlertTriangle, type LucideIcon } from "lucide-react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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
          <h2 className="text-xl font-black text-[var(--text-primary)]">{title}</h2>
          {description ? (
            <p className="max-w-2xl text-sm font-semibold leading-7 text-[var(--text-secondary)]">
              {description}
            </p>
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
  meta?: string;
  tint: string;
}) {
  return (
    <div className="ui-surface rounded-[30px] p-5 transition hover:translate-y-[-2px]">
      <div className="flex items-center gap-4">
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-[18px]"
          style={{ background: `${tint}15`, color: tint }}
        >
          <Icon size={22} />
        </div>
        <div>
          <p className="text-xs font-black text-[var(--text-tertiary)]">{label}</p>
          <p className="text-xl font-black text-[var(--text-primary)]">{value}</p>
        </div>
      </div>
      {meta ? (
        <div className="mt-4 border-t border-[var(--border)] pt-3 text-[11px] font-extrabold text-[var(--text-tertiary)]">
          {meta}
        </div>
      ) : null}
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
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[24px] bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
        <Icon size={32} />
      </div>
      <h3 className="mb-2 text-lg font-black text-[var(--text-primary)]">{title}</h3>
      <p className="mx-auto max-w-sm text-sm font-semibold leading-7 text-[var(--text-tertiary)]">
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          className="ui-button ui-button--secondary mt-6"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
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

export function statusTone(status: "success" | "warning" | "danger" | "info") {
  if (status === "success") return "ui-pill ui-pill--success";
  if (status === "warning") return "ui-pill ui-pill--warning";
  if (status === "danger") return "ui-pill ui-pill--danger";
  return "ui-pill";
}

export function relationName(value: any) {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }
  return value.name ?? null;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ar-IQ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
