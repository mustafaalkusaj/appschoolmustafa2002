"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/brand/brand-utils";
import { ChevronDown, Lock, Clock } from "@/lib/icons";

type ScheduleCell = {
  subject: string;
  teacher_name: string | null;
  is_locked: boolean;
};

type ScheduleGrid = Record<string, Record<string, ScheduleCell>>;

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

interface MobileScheduleViewProps {
  grid: ScheduleGrid;
  timeSlots: TimeSlot[];
  workingDays: WorkingDay[];
  canEdit: boolean;
  onCellClick: (day: string, slotId: string) => void;
}

const DAY_ACCENT_COLORS = [
  "var(--primary)",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
] as const;

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.035,
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
} as Variants;

function formatTimeAr(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "م" : "ص";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

export function MobileScheduleView({
  grid,
  timeSlots,
  workingDays,
  canEdit,
  onCellClick,
}: MobileScheduleViewProps) {
  const activeDays = workingDays
    .filter((d) => d.is_active)
    .sort((a, b) => a.day_order - b.day_order);

  const activeSlots = timeSlots
    .filter((s) => s.is_active)
    .sort((a, b) => a.slot_order - b.slot_order);

  const [expandedDay, setExpandedDay] = useState<string | null>(
    activeDays[0]?.day_key ?? null,
  );

  const handleToggle = useCallback((dayKey: string) => {
    setExpandedDay((prev) => (prev === dayKey ? null : dayKey));
  }, []);

  const handleCardClick = useCallback(
    (dayKey: string, slot: TimeSlot) => {
      if (!canEdit || slot.slot_type === "break") return;
      onCellClick(dayKey, slot.id);
    },
    [canEdit, onCellClick],
  );

  if (activeDays.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl p-8 text-sm"
        style={{ color: "var(--text-muted, var(--muted-foreground))" }}
      >
        لا توجد أيام عمل مفعّلة
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeDays.map((day, dayIdx) => {
        const isOpen = expandedDay === day.day_key;
        const dayColor = DAY_ACCENT_COLORS[dayIdx % DAY_ACCENT_COLORS.length];
        const daySlots = grid[day.day_key] ?? {};

        const periodSlots = activeSlots.filter(
          (s) => s.slot_type === "period",
        );
        const filledCount = periodSlots.filter(
          (s) => daySlots[s.id]?.subject,
        ).length;

        return (
          <div
            key={day.day_key}
            className="overflow-hidden rounded-2xl"
            style={{
              background: "var(--card-bg, var(--card))",
              border: "1px solid var(--border)",
            }}
          >
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => handleToggle(day.day_key)}
              className={cn(
                "flex w-full items-center gap-3 p-4 text-start",
                "transition-colors hover:bg-[var(--surface-soft)]",
              )}
              aria-expanded={isOpen}
            >
              {/* Day initial badge */}
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `color-mix(in srgb, ${dayColor} 12%, transparent)`,
                }}
              >
                <span
                  className="text-sm font-black"
                  style={{ color: dayColor }}
                >
                  {day.name_ar.charAt(0)}
                </span>
              </div>

              {/* Day name + fill count */}
              <div className="min-w-0 flex-1">
                <div
                  className="text-sm font-black"
                  style={{ color: "var(--text-primary, var(--foreground))" }}
                >
                  {day.name_ar}
                </div>
                <div
                  className="text-[10px] font-bold"
                  style={{ color: "var(--text-muted, var(--muted-foreground))" }}
                >
                  {filledCount} / {periodSlots.length} حصة مسجلة
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="h-1.5 w-16 flex-shrink-0 overflow-hidden rounded-full"
                style={{ background: "var(--surface-muted, var(--muted))" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${periodSlots.length > 0 ? (filledCount / periodSlots.length) * 100 : 0}%`,
                    background: dayColor,
                  }}
                />
              </div>

              {/* Chevron */}
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex-shrink-0"
              >
                <ChevronDown
                  size={16}
                  style={{ color: "var(--text-muted, var(--muted-foreground))" }}
                />
              </motion.span>
            </button>

            {/* Accordion Body */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 px-4 pb-4">
                    {activeSlots.map((slot, idx) => {
                      const cell = daySlots[slot.id];
                      const isBreak = slot.slot_type === "break";
                      const isEmpty = !cell || !cell.subject;
                      const isLocked = cell?.is_locked ?? false;
                      const isClickable = canEdit && !isBreak;

                      /* ── Break card ── */
                      if (isBreak) {
                        return (
                          <motion.div
                            key={slot.id}
                            custom={idx}
                            initial="hidden"
                            animate="visible"
                            variants={CARD_VARIANTS}
                            className="flex items-center gap-3 rounded-xl px-3 py-2"
                            style={{
                              background:
                                "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(251,191,36,0.08) 4px, rgba(251,191,36,0.08) 8px)",
                              border: "1px solid rgba(251,191,36,0.15)",
                            }}
                          >
                            <span className="text-[10px] font-bold tabular-nums text-amber-500/60">
                              {formatTimeAr(slot.start_time)}
                            </span>
                            <span className="text-xs font-bold text-amber-500/50">
                              {slot.name_ar}
                            </span>
                          </motion.div>
                        );
                      }

                      /* ── Period card ── */
                      return (
                        <motion.div
                          key={slot.id}
                          custom={idx}
                          initial="hidden"
                          animate="visible"
                          variants={CARD_VARIANTS}
                        >
                          <button
                            type="button"
                            disabled={!isClickable}
                            onClick={() => handleCardClick(day.day_key, slot)}
                            className={cn(
                              "relative flex w-full items-center gap-3 rounded-xl px-3 py-3",
                              "text-start transition-all",
                              isEmpty
                                ? "border border-dashed border-[var(--border)]"
                                : "border border-[var(--border)]",
                              isClickable &&
                                "hover:bg-[var(--surface-soft)] active:scale-[0.99]",
                              !isClickable && "cursor-default",
                            )}
                            style={{
                              borderTop: !isEmpty
                                ? `2px solid ${dayColor}`
                                : undefined,
                            }}
                          >
                            {/* Time */}
                            <div className="flex w-12 flex-shrink-0 flex-col items-center gap-0.5">
                              <Clock
                                size={10}
                                style={{ color: "var(--text-muted, var(--muted-foreground))" }}
                              />
                              <span
                                className="text-[10px] font-bold tabular-nums"
                                style={{ color: "var(--text-muted, var(--muted-foreground))" }}
                              >
                                {formatTimeAr(slot.start_time)}
                              </span>
                              <span
                                className="text-[9px] tabular-nums"
                                style={{ color: "var(--text-muted, var(--muted-foreground))", opacity: 0.6 }}
                              >
                                {formatTimeAr(slot.end_time)}
                              </span>
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                              <div
                                className="mb-0.5 text-[10px] font-medium"
                                style={{ color: "var(--text-muted, var(--muted-foreground))" }}
                              >
                                {slot.name_ar}
                              </div>

                              {isEmpty ? (
                                <span
                                  className="text-xs italic"
                                  style={{
                                    color: "var(--text-muted, var(--muted-foreground))",
                                    opacity: 0.5,
                                  }}
                                >
                                  فارغة
                                </span>
                              ) : (
                                <>
                                  <div
                                    className="text-xs font-black"
                                    style={{ color: dayColor }}
                                  >
                                    {cell.subject}
                                  </div>
                                  {cell.teacher_name && (
                                    <div
                                      className="mt-0.5 text-[10px] font-bold"
                                      style={{ color: "var(--text-muted, var(--muted-foreground))" }}
                                    >
                                      {cell.teacher_name}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Lock indicator */}
                            {isLocked && (
                              <Lock
                                size={13}
                                className="flex-shrink-0"
                                style={{ color: "var(--text-muted, var(--muted-foreground))", opacity: 0.6 }}
                              />
                            )}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default MobileScheduleView;
