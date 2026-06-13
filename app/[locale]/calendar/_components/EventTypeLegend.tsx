import { EVENT_TYPE_CONFIG } from "../_hooks/useCalendarEvents";

type Props = {
  activeFilter: string | null;
  onFilter: (type: string | null) => void;
};

export function EventTypeLegend({ activeFilter, onFilter }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onFilter(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
          !activeFilter
            ? "bg-[var(--primary)] text-white shadow-sm"
            : "bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
        }`}
      >
        الكل
      </button>
      {Object.entries(EVENT_TYPE_CONFIG).map(([type, cfg]) => (
        <button
          key={type}
          onClick={() => onFilter(activeFilter === type ? null : type)}
          className="px-3 py-1.5 rounded-lg text-xs font-black transition"
          style={{
            backgroundColor: activeFilter === type ? cfg.color : cfg.bg,
            color: activeFilter === type ? "white" : cfg.color,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {cfg.label}
        </button>
      ))}
    </div>
  );
}
