"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Lock, LockOpen } from "@/lib/icons";
import { cn } from "@/lib/brand/brand-utils";
import type { ScheduleGrid as ScheduleGridType } from "../_hooks/useSchedule";
import type { TimeSlot, WorkingDay } from "../_hooks/useTimeSlotsSettings";
import { SCHEDULE_DAYS, SCHEDULE_PERIODS } from "../_hooks/useSchedule";

const STATIC_DAY_LABELS: Record<string, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

// 12 distinct vibrant palettes — each subject gets its own color
const SUBJECT_PALETTES = [
  { bg: "#eff6ff", accent: "#2563eb", text: "#1e40af", muted: "#93c5fd" }, // blue
  { bg: "#f0fdf4", accent: "#16a34a", text: "#166534", muted: "#86efac" }, // green
  { bg: "#fdf4ff", accent: "#c026d3", text: "#86198f", muted: "#e879f9" }, // fuchsia
  { bg: "#fff7ed", accent: "#ea580c", text: "#9a3412", muted: "#fdba74" }, // orange
  { bg: "#ecfeff", accent: "#0891b2", text: "#155e75", muted: "#67e8f9" }, // cyan
  { bg: "#fef2f2", accent: "#dc2626", text: "#991b1b", muted: "#fca5a5" }, // red
  { bg: "#f5f3ff", accent: "#7c3aed", text: "#5b21b6", muted: "#c4b5fd" }, // violet
  { bg: "#f0fdfa", accent: "#0d9488", text: "#115e59", muted: "#5eead4" }, // teal
  { bg: "#fffbeb", accent: "#d97706", text: "#92400e", muted: "#fcd34d" }, // amber
  { bg: "#f0f9ff", accent: "#0284c7", text: "#075985", muted: "#7dd3fc" }, // sky
  { bg: "#f7fee7", accent: "#65a30d", text: "#3f6212", muted: "#bef264" }, // lime
  { bg: "#fff1f2", accent: "#e11d48", text: "#9f1239", muted: "#fda4af" }, // rose
];

function getSubjectColor(subject: string) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) & 0xffffffff;
  }
  return SUBJECT_PALETTES[Math.abs(hash) % SUBJECT_PALETTES.length]!;
}

type DragInfo = { day: string; slotId: string } | null;

type Props = {
  grid: ScheduleGridType;
  timeSlots: TimeSlot[];
  workingDays: WorkingDay[];
  canEdit: boolean;
  onCellClick: (day: string, slotId: string) => void;
  onSwapCells?: (from: { day: string; slotId: string }, to: { day: string; slotId: string }) => void;
  onToggleLock?: (day: string, slotId: string) => void;
};

export function ScheduleGrid({ grid, timeSlots, workingDays, canEdit, onCellClick, onSwapCells, onToggleLock }: Props) {
  const [dragging, setDragging] = useState<DragInfo>(null);
  const [dragOver, setDragOver] = useState<DragInfo>(null);
  const dragRef = useRef<DragInfo>(null);

  const activeDays =
    workingDays.length > 0
      ? workingDays.filter((d) => d.is_active).sort((a, b) => a.day_order - b.day_order)
      : SCHEDULE_DAYS.map((key, i) => ({
          id: key,
          day_key: key,
          name_ar: STATIC_DAY_LABELS[key] ?? key,
          name_en: key,
          is_active: true,
          day_order: i,
          school_id: "",
          created_at: "",
        }));

  const activeSlots =
    timeSlots.length > 0
      ? timeSlots.filter((s) => s.is_active).sort((a, b) => a.slot_order - b.slot_order)
      : SCHEDULE_PERIODS.map((p, i) => ({
          id: String(p),
          name_ar: `الحصة ${p}`,
          name_en: `Period ${p}`,
          start_time: null,
          end_time: null,
          slot_type: "period" as const,
          slot_order: i,
          is_active: true,
          school_id: "",
          created_at: "",
        }));

  const handleDragStart = useCallback((day: string, slotId: string, isLocked: boolean) => {
    if (isLocked) return;
    const info = { day, slotId };
    dragRef.current = info;
    setDragging(info);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    setDragging(null);
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((toDay: string, toSlotId: string, isLocked: boolean) => {
    if (!dragRef.current || isLocked) return;
    const from = dragRef.current;
    if (from.day !== toDay || from.slotId !== toSlotId) {
      onSwapCells?.(from, { day: toDay, slotId: toSlotId });
    }
    setDragging(null);
    setDragOver(null);
    dragRef.current = null;
  }, [onSwapCells]);

  // Skeleton
  if (timeSlots.length === 0 && workingDays.length === 0) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]" style={{ background: "#fff" }}>
        <div className="h-16 rounded-t-2xl animate-pulse" style={{ background: "var(--schedule-header-bg)" }} />
        {[1, 2, 3, 4, 5].map((r) => (
          <div key={r} className="h-24 border-t border-[var(--border)] animate-pulse" style={{ background: r % 2 === 0 ? "#ffffff" : "#fafafa" }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-2xl border border-[var(--border)]"
      style={{ background: "#ffffff", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
    >
      <table
        className="w-full text-sm"
        style={{ minWidth: 120 + activeSlots.length * 152, borderCollapse: "separate", borderSpacing: 0 }}
      >
        <thead>
          <tr>
            {/* Corner */}
            <th
              className="sticky end-0 z-20"
              style={{
                width: 100, minWidth: 100,
                padding: "16px 12px",
                background: "var(--schedule-header-bg)",
                borderBottom: "3px solid rgba(255,255,255,0.15)",
                borderInlineEnd: "2px solid rgba(255,255,255,0.12)",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                اليوم
              </span>
            </th>

            {activeSlots.map((slot, idx) => {
              const isBreak = slot.slot_type === "break";
              const periodNumber = isBreak ? null : activeSlots.slice(0, idx).filter(s => s.slot_type !== "break").length + 1;
              return (
                <motion.th
                  key={slot.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.025, duration: 0.22 }}
                  style={{
                    padding: isBreak ? "12px 6px" : "0",
                    background: isBreak ? "var(--schedule-break-header-bg)" : "var(--schedule-header-bg)",
                    borderBottom: "3px solid rgba(255,255,255,0.15)",
                    borderInlineStart: "1px solid rgba(255,255,255,0.08)",
                    textAlign: "center",
                    minWidth: isBreak ? 76 : 152,
                    width: isBreak ? 76 : 152,
                  }}
                >
                  {isBreak ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <span style={{ fontSize: 18 }}>☕</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#fbbf24", letterSpacing: "0.03em" }}>{slot.name_ar}</span>
                      {slot.start_time && (
                        <span style={{ fontSize: 8, color: "rgba(251,191,36,0.5)", direction: "ltr" }}>
                          {slot.start_time}–{slot.end_time}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", height: "100%" }}>
                      {/* Period number pill */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "10px 8px 4px",
                      }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 24, height: 24, borderRadius: "50%",
                          background: "rgba(255,255,255,0.18)",
                          fontSize: 11, fontWeight: 900, color: "#fff",
                        }}>
                          {periodNumber}
                        </span>
                      </div>
                      {/* Name */}
                      <div style={{ padding: "0 8px 6px", textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--schedule-header-text)", lineHeight: 1.2 }}>
                          {slot.name_ar}
                        </div>
                        {slot.start_time && (
                          <div style={{ fontSize: 9, color: "var(--schedule-header-muted)", direction: "ltr", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                            {slot.start_time} – {slot.end_time}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {activeDays.map((day, dayIdx) => {
            const dayKey = "day_key" in day ? day.day_key : (day as { id: string }).id;
            const dayLabel = "name_ar" in day ? day.name_ar : STATIC_DAY_LABELS[dayKey] ?? dayKey;

            return (
              <motion.tr
                key={dayKey}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: dayIdx * 0.04, duration: 0.25, ease: "easeOut" }}
                style={{ background: "#ffffff" }}
              >
                {/* Day label — sticky */}
                <td
                  className="sticky end-0 z-10"
                  style={{
                    padding: "10px 8px",
                    width: 100, minWidth: 100,
                    borderTop: "1px solid #f1f5f9",
                    borderInlineEnd: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    verticalAlign: "middle",
                    textAlign: "center",
                  }}
                >
                  <div style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    padding: "5px 10px", borderRadius: 20,
                    background: "var(--primary-soft, #eff6ff)",
                    border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)" }}>
                      {dayLabel}
                    </span>
                  </div>
                </td>

                {activeSlots.map((slot) => {
                  const isBreak = slot.slot_type === "break";
                  const cell = grid[dayKey]?.[slot.id];
                  const isEmpty = !cell?.subject;
                  const isLocked = cell?.is_locked ?? false;
                  const isDraggingThis = dragging?.day === dayKey && dragging.slotId === slot.id;
                  const isDragOverThis = dragOver?.day === dayKey && dragOver.slotId === slot.id;
                  const color = !isEmpty ? getSubjectColor(cell.subject) : null;

                  if (isBreak) {
                    return (
                      <td
                        key={slot.id}
                        style={{
                          width: 76, minWidth: 76,
                          borderTop: "1px solid #f1f5f9",
                          borderInlineStart: "1px solid #f1f5f9",
                          background: "repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(251,191,36,0.06) 6px,rgba(251,191,36,0.06) 12px)",
                          verticalAlign: "middle",
                          textAlign: "center",
                          padding: "8px 4px",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <span style={{ fontSize: 15, lineHeight: 1 }}>☕</span>
                          {slot.start_time && slot.end_time && (
                            <span style={{ fontSize: 8, color: "#d97706", direction: "ltr", fontVariantNumeric: "tabular-nums" }}>
                              {slot.start_time}–{slot.end_time}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={slot.id}
                      style={{
                        padding: 6,
                        borderTop: "1px solid #f1f5f9",
                        borderInlineStart: "1px solid #f1f5f9",
                        verticalAlign: "middle",
                        minWidth: 152,
                      }}
                      onDragOver={(e) => {
                        if (!canEdit || isLocked) return;
                        e.preventDefault();
                        setDragOver({ day: dayKey, slotId: slot.id });
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => handleDrop(dayKey, slot.id, isLocked)}
                    >
                      <motion.div
                        draggable={canEdit && !isEmpty && !isLocked}
                        onDragStart={() => handleDragStart(dayKey, slot.id, isLocked)}
                        onDragEnd={handleDragEnd}
                        onClick={() => canEdit && !isDraggingThis && onCellClick(dayKey, slot.id)}
                        whileHover={canEdit && !isLocked ? { scale: 1.02, transition: { duration: 0.12 } } : undefined}
                        whileTap={canEdit && !isLocked ? { scale: 0.97 } : undefined}
                        animate={
                          isDraggingThis
                            ? { opacity: 0.3, scale: 0.91 }
                            : isDragOverThis && !isLocked
                            ? { scale: 1.04, transition: { duration: 0.1 } }
                            : { opacity: 1, scale: 1 }
                        }
                        style={{
                          borderRadius: 12,
                          minHeight: 82,
                          overflow: "hidden",
                          position: "relative",
                          cursor: canEdit && !isLocked ? "pointer" : "default",
                          background: isEmpty ? "transparent" : color!.bg,
                          border: isEmpty
                            ? canEdit ? "1.5px dashed #cbd5e1" : "none"
                            : `1.5px solid ${color!.accent}30`,
                          boxShadow: !isEmpty ? `0 1px 6px ${color!.accent}18` : "none",
                          outline: isDragOverThis && !isLocked ? `2px solid var(--primary)` : "none",
                          outlineOffset: isDragOverThis ? 2 : 0,
                          transition: "box-shadow 0.15s, border-color 0.15s",
                        }}
                        className={cn(
                          isEmpty && canEdit && "hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/4",
                        )}
                      >
                        {/* Accent bar — inline start */}
                        {!isEmpty && color && (
                          <motion.div
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 0.28, ease: "easeOut" }}
                            style={{
                              position: "absolute",
                              top: 0, bottom: 0,
                              insetInlineStart: 0,
                              width: 4,
                              borderRadius: "12px 0 0 12px",
                              background: color.accent,
                              transformOrigin: "top",
                            }}
                          />
                        )}

                        {/* Pulse ring on empty cells */}
                        {isEmpty && canEdit && (
                          <motion.div
                            animate={{ opacity: [0, 0.15, 0] }}
                            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                              position: "absolute", inset: 0, borderRadius: 12,
                              border: "2px solid var(--primary)",
                              pointerEvents: "none",
                            }}
                          />
                        )}

                        <div style={{ padding: "10px 12px 10px 16px" }}>
                          {isEmpty ? (
                            canEdit ? (
                              <div style={{
                                display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                height: 58, gap: 4,
                              }}>
                                <span style={{ fontSize: 20, color: "#cbd5e1", lineHeight: 1 }}>+</span>
                                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>إضافة حصة</span>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 58 }}>
                                <span style={{ fontSize: 22, color: "#e2e8f0" }}>—</span>
                              </div>
                            )
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                              {/* Subject row */}
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                                <span style={{
                                  fontSize: 13, fontWeight: 900,
                                  color: color!.text, lineHeight: 1.3, flex: 1,
                                }}>
                                  {cell.subject}
                                </span>
                                {canEdit && (
                                  <motion.button
                                    whileTap={{ scale: 0.75 }}
                                    onClick={(e) => { e.stopPropagation(); onToggleLock?.(dayKey, slot.id); }}
                                    style={{
                                      flexShrink: 0, background: "transparent", border: "none",
                                      cursor: "pointer", padding: 0, marginTop: 1,
                                      opacity: isLocked ? 1 : 0.25,
                                      transition: "opacity 0.15s",
                                    }}
                                    title={isLocked ? "فك التثبيت" : "تثبيت"}
                                  >
                                    {isLocked
                                      ? <Lock size={12} color="#f59e0b" />
                                      : <LockOpen size={12} color={color!.accent} />}
                                  </motion.button>
                                )}
                              </div>

                              {/* Teacher */}
                              {cell.teacher_name && (
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: 16, height: 16, borderRadius: "50%",
                                    background: `${color!.accent}20`,
                                    fontSize: 9, flexShrink: 0,
                                  }}>
                                    👤
                                  </span>
                                  <span style={{
                                    fontSize: 11, color: "#64748b",
                                    fontWeight: 600, lineHeight: 1.2,
                                  }}>
                                    {cell.teacher_name}
                                  </span>
                                </div>
                              )}

                              {/* Locked badge */}
                              {isLocked && (
                                <span style={{
                                  display: "inline-block", fontSize: 9, fontWeight: 800,
                                  color: "#92400e",
                                  background: "rgba(245,158,11,0.15)",
                                  borderRadius: 4, padding: "1px 6px",
                                  alignSelf: "flex-start",
                                }}>
                                  مثبتة
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </td>
                  );
                })}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
