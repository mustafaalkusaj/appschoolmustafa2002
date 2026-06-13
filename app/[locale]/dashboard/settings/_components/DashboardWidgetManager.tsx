"use client";

import { useRef, useState } from "react";
import { GripVertical, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { DASHBOARD_WIDGETS, type WidgetId } from "@/lib/dashboard-widgets";

// ─── Drag state ───────────────────────────────────────────────────────────────

interface DragState {
  draggingId: WidgetId | null;
  overId: WidgetId | null;
}

// ─── Single widget row ────────────────────────────────────────────────────────

interface WidgetRowProps {
  id: WidgetId;
  nameAr: string;
  descAr: string;
  isHidden: boolean;
  isDragging: boolean;
  isOver: boolean;
  onToggle: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

function WidgetRow({
  nameAr,
  descAr,
  isHidden,
  isDragging,
  isOver,
  onToggle,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: WidgetRowProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={[
        "flex items-center gap-3 p-3 rounded-xl border transition-all select-none",
        isDragging
          ? "opacity-40 border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]"
          : isOver
            ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] scale-[1.01]"
            : "border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--surface-soft)]",
      ].join(" ")}
    >
      {/* Drag handle */}
      <div
        className="flex-shrink-0 text-[var(--text-muted)] cursor-grab active:cursor-grabbing"
        aria-label="اسحب لإعادة الترتيب"
      >
        <GripVertical size={18} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={[
            "text-sm font-bold leading-tight",
            isHidden ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]",
          ].join(" ")}
        >
          {nameAr}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
          {descAr}
        </p>
      </div>

      {/* Visibility toggle */}
      <button
        type="button"
        onClick={onToggle}
        className={[
          "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95",
          isHidden
            ? "bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text-secondary)]"
            : "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)] hover:bg-[color-mix(in_srgb,var(--success)_20%,transparent)]",
        ].join(" ")}
        aria-label={isHidden ? "إظهار القسم" : "إخفاء القسم"}
      >
        {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
        <span>{isHidden ? "مخفي" : "ظاهر"}</span>
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardWidgetManager() {
  const { order, hidden, setOrder, toggleHidden, reset } = useDashboardLayout();
  const [drag, setDrag] = useState<DragState>({ draggingId: null, overId: null });
  const dragIdRef = useRef<WidgetId | null>(null);

  // Build the sorted list of widgets according to current order,
  // filling in any new IDs not yet stored in localStorage.
  const sortedWidgets = order
    .map((id) => DASHBOARD_WIDGETS.find((w) => w.id === id))
    .filter((w): w is (typeof DASHBOARD_WIDGETS)[number] => w !== undefined);

  // Also append widgets that exist in DASHBOARD_WIDGETS but not in order (new additions).
  const knownIds = new Set(order);
  for (const w of DASHBOARD_WIDGETS) {
    if (!knownIds.has(w.id)) sortedWidgets.push(w);
  }

  function handleDragStart(id: WidgetId) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      dragIdRef.current = id;
      e.dataTransfer.effectAllowed = "move";
      setDrag({ draggingId: id, overId: null });
    };
  }

  function handleDragOver(id: WidgetId) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (id !== drag.draggingId) {
        setDrag((prev) => ({ ...prev, overId: id }));
      }
    };
  }

  function handleDrop(targetId: WidgetId) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const sourceId = dragIdRef.current;
      if (!sourceId || sourceId === targetId) {
        setDrag({ draggingId: null, overId: null });
        return;
      }

      const currentOrder = sortedWidgets.map((w) => w.id);
      const fromIdx = currentOrder.indexOf(sourceId);
      const toIdx = currentOrder.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return;

      const next = [...currentOrder];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, sourceId);
      setOrder(next);
      setDrag({ draggingId: null, overId: null });
    };
  }

  function handleDragEnd() {
    dragIdRef.current = null;
    setDrag({ draggingId: null, overId: null });
  }

  const hiddenCount = hidden.length;
  const isDirty =
    hiddenCount > 0 ||
    order.join(",") !== DASHBOARD_WIDGETS.map((w) => w.id).join(",");

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--text-muted)]">
            اسحب الأقسام لإعادة ترتيبها · اضغط على الزر لإظهار/إخفاء كل قسم
          </p>
          {hiddenCount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
              {hiddenCount === 1
                ? "قسم واحد مخفي حالياً"
                : `${hiddenCount} أقسام مخفية حالياً`}
            </p>
          )}
        </div>
        {isDirty && (
          <button
            type="button"
            onClick={reset}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-all active:scale-95"
          >
            <RotateCcw size={13} />
            <span>إعادة الضبط</span>
          </button>
        )}
      </div>

      {/* Widget list */}
      <div className="space-y-2">
        {sortedWidgets.map((widget) => (
          <WidgetRow
            key={widget.id}
            id={widget.id}
            nameAr={widget.nameAr}
            descAr={widget.descAr}
            isHidden={hidden.includes(widget.id)}
            isDragging={drag.draggingId === widget.id}
            isOver={drag.overId === widget.id}
            onToggle={() => toggleHidden(widget.id)}
            onDragStart={handleDragStart(widget.id)}
            onDragOver={handleDragOver(widget.id)}
            onDrop={handleDrop(widget.id)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* Note */}
      <p className="text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
        التغييرات تُطبَّق فوراً على لوحة التحكم وتُحفظ في المتصفح.
      </p>
    </div>
  );
}
