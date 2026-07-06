"use client";

import { useState, useCallback, useRef, type DragEvent } from "react";
import { cn } from "@/lib/brand/brand-utils";
import { Lock, GripVertical, Plus } from "@/lib/icons";
import { motion } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type ScheduleCell = {
  subject: string;
  teacher_name: string | null;
  is_locked: boolean;
};

type ScheduleGridData = Record<string, Record<string, ScheduleCell>>;

type TimeSlot = {
  id: string;
  name_ar: string;
  start_time: string;
  end_time: string;
  slot_type: "period" | "break";
  slot_order: number;
  is_active: boolean;
};

type WorkingDay = {
  day_key: string;
  name_ar: string;
  day_order: number;
  is_active: boolean;
};

type Props = {
  grid: ScheduleGridData;
  timeSlots: TimeSlot[];
  workingDays: WorkingDay[];
  canEdit: boolean;
  onCellClick: (day: string, slotId: string) => void;
  onSwapCells: (
    day1: string,
    slot1: string,
    day2: string,
    slot2: string,
  ) => void;
  onToggleLock: (day: string, slotId: string) => void;
};

type DragRef = { day: string; slot: string } | null;

// ─── Row accent palette ──────────────────────────────────────────────────────

const DAY_ACCENTS = [
  "59, 130, 246", // blue
  "16, 185, 129", // emerald
  "245, 158, 11", // amber
  "139, 92, 246", // violet
  "236, 72, 153", // pink
  "20, 184, 166", // teal
  "244, 63, 94", // rose
] as const;

// ─── Internal cell ───────────────────────────────────────────────────────────

interface CellProps {
  dayKey: string;
  slot: TimeSlot;
  cell: ScheduleCell | undefined;
  accent: string;
  canEdit: boolean;
  isDragging: boolean;
  isDragTarget: boolean;
  onCellClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragEnter: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onDragEnd: () => void;
}

function ScheduleCellItem({
  slot,
  cell,
  accent,
  canEdit,
  isDragging,
  isDragTarget,
  onCellClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDrop,
  onDragEnd,
}: CellProps) {
  const isBreak = slot.slot_type === "break";
  const isFilled = Boolean(cell?.subject);
  const isLocked = Boolean(cell?.is_locked);

  // ── Break cell ──
  if (isBreak) {
    return (
      <td
        className="rounded-xl"
        style={{
          background:
            "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(251,191,36,0.12) 4px, rgba(251,191,36,0.12) 8px)",
          border: "1px solid rgba(251,191,36,0.2)",
        }}
      >
        <div className="flex items-center justify-center h-[72px] text-[10px] font-bold text-amber-500/60 select-none">
          استراحة
        </div>
      </td>
    );
  }

  // ── Period cell (filled or empty) ──
  return (
    <td
      draggable={canEdit && isFilled && !isLocked}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onCellClick}
      onContextMenu={onContextMenu}
      className={cn(
        "rounded-xl transition-all duration-150 group relative",
        canEdit && !isLocked && isFilled && "cursor-grab active:cursor-grabbing",
        canEdit && !isFilled && "cursor-pointer",
        canEdit && isLocked && "cursor-pointer",
        isDragging && "opacity-40 scale-95",
        isDragTarget && "ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--card-bg)]",
      )}
      style={{
        background: isFilled ? `rgba(${accent}, 0.05)` : "transparent",
        border: isFilled
          ? `1px solid rgba(${accent}, 0.15)`
          : "1.5px dashed var(--border-strong)",
        borderTop: isFilled ? `3px solid rgba(${accent}, 0.6)` : undefined,
      }}
    >
      <div className="relative p-2.5 min-h-[72px] flex flex-col justify-center">
        {isFilled ? (
          <>
            {/* Subject */}
            <div
              className="text-xs font-black leading-tight mb-0.5 line-clamp-2"
              style={{ color: `rgb(${accent})` }}
            >
              {cell!.subject}
            </div>

            {/* Teacher */}
            {cell!.teacher_name && (
              <div className="text-[10px] font-bold text-[var(--text-muted)] line-clamp-1 mt-0.5">
                {cell!.teacher_name}
              </div>
            )}

            {/* Lock badge */}
            {isLocked && (
              <Lock
                size={10}
                className="absolute top-1.5 end-1.5 text-[var(--text-muted)]"
                style={{ opacity: 0.5 }}
              />
            )}

            {/* Drag handle */}
            {canEdit && !isLocked && (
              <GripVertical
                size={12}
                className="absolute top-1.5 start-1 opacity-0 group-hover:opacity-40 transition-opacity"
                style={{ color: "var(--text-muted)" }}
              />
            )}
          </>
        ) : (
          /* Empty cell */
          <div className="flex items-center justify-center h-full">
            {canEdit && (
              <Plus
                size={16}
                className="opacity-0 group-hover:opacity-50 transition-opacity"
                style={{ color: "var(--primary)" }}
              />
            )}
          </div>
        )}
      </div>
    </td>
  );
}

// ─── Main grid component ─────────────────────────────────────────────────────

export function ScheduleGrid({
  grid,
  timeSlots,
  workingDays,
  canEdit,
  onCellClick,
  onSwapCells,
  onToggleLock,
}: Props) {
  const [dragSource, setDragSource] = useState<DragRef>(null);
  const [dragOver, setDragOver] = useState<DragRef>(null);
  const dragSourceRef = useRef<DragRef>(null);

  const activeSlots = timeSlots
    .filter((s) => s.is_active)
    .sort((a, b) => a.slot_order - b.slot_order);

  const activeDays = workingDays
    .filter((d) => d.is_active)
    .sort((a, b) => a.day_order - b.day_order);

  // ── Drag handlers ──

  const handleDragStart = useCallback(
    (e: DragEvent, day: string, slotId: string) => {
      const cell = grid[day]?.[slotId];
      if (!cell || cell.is_locked || !canEdit) {
        e.preventDefault();
        return;
      }
      const ref = { day, slot: slotId };
      setDragSource(ref);
      dragSourceRef.current = ref;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `${day}|${slotId}`);
    },
    [grid, canEdit],
  );

  const handleDragOver = useCallback(
    (e: DragEvent, slotId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const slot = timeSlots.find((s) => s.id === slotId);
      if (slot?.slot_type === "break") return;
    },
    [timeSlots],
  );

  const handleDragEnter = useCallback(
    (day: string, slotId: string) => {
      const slot = timeSlots.find((s) => s.id === slotId);
      if (slot?.slot_type === "break") return;
      setDragOver({ day, slot: slotId });
    },
    [timeSlots],
  );

  const handleDrop = useCallback(
    (e: DragEvent, day: string, slotId: string) => {
      e.preventDefault();
      setDragOver(null);

      const slot = timeSlots.find((s) => s.id === slotId);
      if (slot?.slot_type === "break") return;

      const src = dragSourceRef.current;
      if (src && (src.day !== day || src.slot !== slotId)) {
        const targetCell = grid[day]?.[slotId];
        if (targetCell?.is_locked) return;
        onSwapCells(src.day, src.slot, day, slotId);
      }
      setDragSource(null);
      dragSourceRef.current = null;
    },
    [grid, timeSlots, onSwapCells],
  );

  const handleDragEnd = useCallback(() => {
    setDragSource(null);
    setDragOver(null);
    dragSourceRef.current = null;
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, day: string, slotId: string) => {
      if (!canEdit) return;
      const slot = timeSlots.find((s) => s.id === slotId);
      if (slot?.slot_type === "break") return;
      e.preventDefault();
      onToggleLock(day, slotId);
    },
    [canEdit, timeSlots, onToggleLock],
  );

  return (
    <div className="w-full overflow-x-auto rounded-2xl custom-scrollbar" style={{ backgroundColor: "var(--card-bg)" }}>
      <table
        className="w-full border-separate"
        style={{
          borderSpacing: "3px",
          minWidth: activeSlots.length * 110 + 100,
        }}
        dir="rtl"
      >
        {/* ── Header ── */}
        <thead>
          <tr>
            {/* Corner */}
            <th
              className="sticky start-0 z-20 rounded-xl p-3 text-center text-[10px] font-black uppercase tracking-widest"
              style={{
                background: "var(--surface-soft)",
                color: "var(--text-muted)",
                minWidth: 90,
              }}
            >
              اليوم / الحصة
            </th>

            {activeSlots.map((slot) => (
              <th
                key={slot.id}
                className="rounded-xl p-2.5 text-center"
                style={{
                  background:
                    slot.slot_type === "break"
                      ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(251,191,36,0.08) 4px, rgba(251,191,36,0.08) 8px)"
                      : "var(--surface-soft)",
                  minWidth: slot.slot_type === "break" ? 60 : 100,
                }}
              >
                <div className="text-xs font-black" style={{ color: "var(--text-primary)" }}>
                  {slot.name_ar}
                </div>
                <div
                  className="text-[10px] font-bold mt-0.5 tabular-nums"
                  style={{ color: "var(--text-muted)", direction: "ltr" }}
                >
                  {slot.start_time} - {slot.end_time}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {activeDays.map((day, dayIdx) => {
            const accent = DAY_ACCENTS[dayIdx % DAY_ACCENTS.length];

            return (
              <tr key={day.day_key}>
                {/* Day label */}
                <td
                  className="sticky start-0 z-10 rounded-xl p-3 text-center"
                  style={{
                    background: `rgba(${accent}, 0.06)`,
                    borderInlineStart: `3px solid rgba(${accent}, 0.5)`,
                  }}
                >
                  <span
                    className="text-sm font-black whitespace-nowrap"
                    style={{ color: `rgb(${accent})` }}
                  >
                    {day.name_ar}
                  </span>
                </td>

                {/* Cells */}
                {activeSlots.map((slot) => {
                  const cell = grid[day.day_key]?.[slot.id];
                  const isSrc =
                    dragSource?.day === day.day_key &&
                    dragSource?.slot === slot.id;
                  const isTarget =
                    dragOver?.day === day.day_key &&
                    dragOver?.slot === slot.id;

                  return (
                    <ScheduleCellItem
                      key={slot.id}
                      dayKey={day.day_key}
                      slot={slot}
                      cell={cell}
                      accent={accent}
                      canEdit={canEdit}
                      isDragging={isSrc}
                      isDragTarget={isTarget}
                      onCellClick={() => {
                        if (canEdit && slot.slot_type !== "break") {
                          onCellClick(day.day_key, slot.id);
                        }
                      }}
                      onContextMenu={(e) =>
                        handleContextMenu(e, day.day_key, slot.id)
                      }
                      onDragStart={(e) =>
                        handleDragStart(e, day.day_key, slot.id)
                      }
                      onDragOver={(e) => handleDragOver(e, slot.id)}
                      onDragEnter={() =>
                        handleDragEnter(day.day_key, slot.id)
                      }
                      onDrop={(e) => handleDrop(e, day.day_key, slot.id)}
                      onDragEnd={handleDragEnd}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ScheduleGrid;
