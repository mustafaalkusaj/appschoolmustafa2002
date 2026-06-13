"use client";

interface Props {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function PlaceholderTab({ title, description, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
      {icon ?? (
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      <p className="font-bold text-base text-[var(--text-primary)]">{title}</p>
      {description && (
        <p className="text-sm text-center max-w-sm">{description}</p>
      )}
      <span className="mt-2 text-xs px-3 py-1 rounded-full bg-[var(--surface-soft)] border border-[var(--border)]">
        قريباً
      </span>
    </div>
  );
}
