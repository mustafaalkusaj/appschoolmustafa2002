"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, Lock, GraduationCap } from "@/lib/icons";
import { cn } from "@/lib/brand/brand-utils";
import type { ScheduleGrid } from "../_hooks/useSchedule";
import type { TimeSlot, WorkingDay } from "../_hooks/useTimeSlotsSettings";

// Same 12-color palette as ScheduleGrid — deterministic by subject hash
const SUBJECT_PALETTES = [
  { strip: "#3b82f6", bg: "rgba(59,130,246,0.08)",  text: "#3b82f6" },
  { strip: "#10b981", bg: "rgba(16,185,129,0.08)",  text: "#10b981" },
  { strip: "#f59e0b", bg: "rgba(245,158,11,0.08)",  text: "#f59e0b" },
  { strip: "#a855f7", bg: "rgba(168,85,247,0.08)",  text: "#a855f7" },
  { strip: "#ef4444", bg: "rgba(239,68,68,0.08)",   text: "#ef4444" },
  { strip: "#f97316", bg: "rgba(249,115,22,0.08)",  text: "#f97316" },
  { strip: "#ec4899", bg: "rgba(236,72,153,0.08)",  text: "#ec4899" },
  { strip: "#14b8a6", bg: "rgba(20,184,166,0.08)",  text: "#14b8a6" },
  { strip: "#6366f1", bg: "rgba(99,102,241,0.08)",  text: "#6366f1" },
  { strip: "#06b6d4", bg: "rgba(6,182,212,0.08)",   text: "#06b6d4" },
  { strip: "#84cc16", bg: "rgba(132,204,22,0.08)",  text: "#84cc16" },
  { strip: "#e879f9", bg: "rgba(232,121,249,0.08)", text: "#e879f9" },
];

function getSubjectColor(subject: string) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) & 0xffffffff;
  }
  return SUBJECT_PALETTES[Math.abs(hash) % SUBJECT_PALETTES.length];
}

type Props = {
  grid: ScheduleGrid;
  timeSlots: TimeSlot[];
  workingDays: WorkingDay[];
  canEdit: boolean;
  onCellClick: (day: string, slotId: string) => void;
};

export function MobileScheduleView({ grid, timeSlots, workingDays, canEdit, onCellClick }: Props) {
  const activeDays = workingDays.filter((d) => d.is_active).sort((a, b) => a.day_order - b.day_order);
  const activeSlots = timeSlots.filter((s) => s.is_active).sort((a, b) => a.slot_order - b.slot_order);
  const [dayIdx, setDayIdx] = useState(0);

  if (activeDays.length === 0 || activeSlots.length === 0) return null;

  const currentDay = activeDays[dayIdx];
  const filledToday = activeSlots.filter((s) => s.slot_type !== "break" && grid[currentDay.day_key]?.[s.id]?.subject).length;
  const totalPeriods = activeSlots.filter((s) => s.slot_type !== "break").length;

  return (
    <div className="space-y-4">

      {/* ── Day header card ── */}
      <div
        className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        {/* Accent strip */}
        <div style={{ height: 3, background: "linear-gradient(90deg,var(--primary),var(--success))" }} />

        <div className="flex items-center gap-3 p-4">
          {/* Prev */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setDayIdx((i) => Math.max(0, i - 1))}
            disabled={dayIdx === 0}
            style={{
              width: 40, height: 40, borderRadius: 12,
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--surface-soft)",
              color: "var(--text-muted)",
              cursor: dayIdx === 0 ? "not-allowed" : "pointer",
              opacity: dayIdx === 0 ? 0.3 : 1,
              flexShrink: 0,
              fontSize: 20, fontWeight: 300,
            }}
          >
            ›
          </motion.button>

          {/* Day info */}
          <div className="flex-1 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentDay.day_key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <p style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.2 }}>
                  {currentDay.name_ar}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginTop: 3 }}>
                  {filledToday} / {totalPeriods} حصص مملوءة
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Next */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setDayIdx((i) => Math.min(activeDays.length - 1, i + 1))}
            disabled={dayIdx === activeDays.length - 1}
            style={{
              width: 40, height: 40, borderRadius: 12,
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--surface-soft)",
              color: "var(--text-muted)",
              cursor: dayIdx === activeDays.length - 1 ? "not-allowed" : "pointer",
              opacity: dayIdx === activeDays.length - 1 ? 0.3 : 1,
              flexShrink: 0,
              fontSize: 20, fontWeight: 300,
            }}
          >
            ‹
          </motion.button>
        </div>

        {/* Day pills row */}
        <div
          className="flex gap-2 px-4 pb-4 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {activeDays.map((d, i) => (
            <motion.button
              key={d.day_key}
              whileTap={{ scale: 0.9 }}
              onClick={() => setDayIdx(i)}
              style={{
                flexShrink: 0,
                padding: "7px 16px",
                borderRadius: 20,
                border: i === dayIdx ? "none" : "1px solid var(--border)",
                fontSize: 12, fontWeight: 700,
                cursor: "pointer",
                background: i === dayIdx
                  ? "linear-gradient(135deg,var(--primary),#818cf8)"
                  : "var(--surface-soft)",
                color: i === dayIdx ? "#fff" : "var(--text-muted)",
                boxShadow: i === dayIdx ? "0 3px 10px rgba(99,102,241,0.3)" : "none",
                transition: "all 0.2s",
              }}
            >
              {d.name_ar}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Slots list ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentDay.day_key}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-2"
        >
          {activeSlots.map((slot, slotIdx) => {
            const isBreak = slot.slot_type === "break";
            const cell = grid[currentDay.day_key]?.[slot.id];
            const isEmpty = !cell?.subject;
            const color = !isEmpty ? getSubjectColor(cell.subject) : null;

            // ── Break row ──
            if (isBreak) {
              return (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: slotIdx * 0.04 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "rgba(245,158,11,0.07)",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <Coffee size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#d97706", margin: 0 }}>{slot.name_ar}</p>
                    {slot.start_time && slot.end_time && (
                      <p style={{ fontSize: 10, color: "rgba(217,119,6,0.65)", margin: 0 }}>
                        {slot.start_time} – {slot.end_time}
                      </p>
                    )}
                  </div>
                  <span style={{ marginInlineStart: "auto", fontSize: 18, lineHeight: 1 }}>☕</span>
                </motion.div>
              );
            }

            // ── Period row ──
            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: slotIdx * 0.04, duration: 0.25 }}
                whileTap={canEdit ? { scale: 0.985 } : undefined}
                onClick={() => canEdit && onCellClick(currentDay.day_key, slot.id)}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  borderRadius: 14,
                  border: isEmpty
                    ? "1.5px dashed var(--border-strong)"
                    : `1px solid ${color!.strip}28`,
                  background: isEmpty ? "var(--surface-soft)" : color!.bg,
                  overflow: "hidden",
                  boxShadow: !isEmpty ? `0 2px 10px ${color!.strip}12` : "none",
                  cursor: canEdit ? "pointer" : "default",
                  minHeight: 72,
                  position: "relative",
                  transition: "box-shadow 0.15s",
                }}
                className={cn(canEdit && "hover:shadow-md")}
              >
                {/* Left color strip — 4px */}
                {!isEmpty && color && (
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      width: 4, flexShrink: 0,
                      background: color.strip,
                      transformOrigin: "top",
                    }}
                  />
                )}

                {/* Pulse on empty in edit mode */}
                {isEmpty && canEdit && (
                  <motion.div
                    animate={{ opacity: [0, 0.15, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      position: "absolute", inset: 0, borderRadius: 14,
                      border: "2px solid var(--primary)",
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Time sidebar */}
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  padding: "10px 12px",
                  background: "var(--surface-soft)",
                  borderInlineEnd: "1px solid var(--border)",
                  minWidth: 68,
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", lineHeight: 1 }}>
                    {slot.name_ar.replace("الحصة ", "حصة ")}
                  </span>
                  {slot.start_time && (
                    <>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-primary)", marginTop: 4, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
                        {slot.start_time}
                      </span>
                      <span style={{ fontSize: 9, color: "var(--text-muted)", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
                        {slot.end_time}
                      </span>
                    </>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: "12px 14px", display: "flex", alignItems: "center" }}>
                  {isEmpty ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>
                        {canEdit ? "+ إضافة حصة" : "—"}
                      </span>
                      {canEdit && (
                        <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>
                          انقر للتعديل
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: color!.text, lineHeight: 1.25 }}>
                        {cell.subject}
                      </span>
                      {cell.teacher_name && (
                        <span style={{
                          display: "flex", alignItems: "center", gap: 5,
                          fontSize: 12, color: "var(--text-secondary)", fontWeight: 600,
                        }}>
                          <GraduationCap size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                          {cell.teacher_name}
                        </span>
                      )}
                      {cell.is_locked && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 10, fontWeight: 800,
                          color: "#92400e", background: "rgba(245,158,11,0.13)",
                          borderRadius: 5, padding: "2px 6px",
                          width: "fit-content",
                        }}>
                          <Lock size={9} /> مثبتة
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Empty state — when ALL periods are empty */}
          {activeSlots.filter((s) => s.slot_type !== "break" && grid[currentDay.day_key]?.[s.id]?.subject).length === 0 &&
            activeSlots.filter((s) => s.slot_type !== "break").length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "32px 16px", gap: 10,
                borderRadius: 16,
                background: "var(--surface-soft)",
                border: "1.5px dashed var(--border)",
              }}
            >
              <span style={{ fontSize: 36, lineHeight: 1 }}>📅</span>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", margin: 0 }}>
                لا توجد حصص ليوم {currentDay.name_ar}
              </p>
              {canEdit && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.7, margin: 0 }}>
                  انقر على أي خلية للبدء
                </p>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
