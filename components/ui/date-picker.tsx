"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DatePickerProps {
  value?: string; // "YYYY-MM-DD"
  onChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  min?: string;
  max?: string;
  name?: string;
  id?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

// Arabic week starts Saturday (rightmost col in RTL)
// Columns: Sat(6) Sun(0) Mon(1) Tue(2) Wed(3) Thu(4) Fri(5)
const AR_DAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];
// dayCol maps JS getDay() → column index
function dayCol(jsDay: number): number {
  return (jsDay + 1) % 7;
}

function parseDate(str: string | undefined): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDisplay(str: string | undefined): string {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  if (!y || !m || !d) return str;
  return `${d}/${m}/${y}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// ── Calendar icon ─────────────────────────────────────────────────────────────

function CalIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

// ── DatePicker Component ─────────────────────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  placeholder = "يوم/شهر/سنة",
  disabled,
  error,
  className,
  min,
  max,
  name,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const d = parseDate(value) ?? new Date();
    return d.getFullYear() - 7;
  });
  const [viewYear, setViewYear] = useState(() => {
    const d = parseDate(value) ?? new Date();
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseDate(value) ?? new Date();
    return d.getMonth();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  // Build days grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startCol = dayCol(firstDay.getDay());

  // Previous month fill
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const gridCells: Array<{ day: number; month: "prev" | "cur" | "next"; date: Date }> = [];

  for (let i = startCol - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    gridCells.push({ day: d, month: "prev", date: new Date(viewYear, viewMonth - 1, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push({ day: d, month: "cur", date: new Date(viewYear, viewMonth, d) });
  }
  const remaining = 42 - gridCells.length;
  for (let d = 1; d <= remaining; d++) {
    gridCells.push({ day: d, month: "next", date: new Date(viewYear, viewMonth + 1, d) });
  }

  function pickDay(cell: { date: Date; month: string }) {
    if (cell.month !== "cur") return;
    const iso = formatISO(cell.date);
    onChange?.(iso);
    setOpen(false);
  }

  function isDisabled(date: Date) {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  const displayValue = formatDisplay(value);

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full", className)} dir="rtl">
      {/* Trigger */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 w-full h-[var(--input-height,2.25rem)] px-3 rounded-[var(--input-radius,0.75rem)]",
          "border bg-[var(--surface-soft)] text-sm transition-all duration-150",
          "hover:border-[var(--border-strong)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-1",
          !error ? "border-[var(--input-border,var(--border))]" : "border-[var(--input-border-error)]",
          disabled && "opacity-50 cursor-not-allowed",
          open && "border-[var(--primary)] ring-2 ring-[var(--primary)]/15",
        )}
      >
        <span className="text-[var(--text-tertiary)] flex-shrink-0"><CalIcon /></span>
        <span className={cn("flex-1 text-start truncate", displayValue ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
          {displayValue || placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange?.(null); }}
            onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onChange?.(null))}
            className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors text-base leading-none px-0.5"
            aria-label="مسح التاريخ"
          >×</span>
        )}
      </button>

      {/* Hidden name input for forms */}
      {name && <input type="hidden" name={name} value={value ?? ""} />}

      {/* Calendar popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full mt-1.5 z-50 w-[250px] rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-2xl shadow-black/10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
              <button
                type="button"
                onClick={nextMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] transition-colors text-base font-light"
                aria-label="الشهر التالي"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowYearPicker((v) => !v);
                  setYearRangeStart(viewYear - 7);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-black text-[var(--text-primary)] hover:bg-[var(--surface-soft)] transition-colors"
              >
                {AR_MONTHS[viewMonth]}
                <span className="text-[var(--primary)]">{viewYear}</span>
                <span className="text-[var(--text-muted)] text-xs">{showYearPicker ? "▴" : "▾"}</span>
              </button>

              <button
                type="button"
                onClick={prevMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] transition-colors text-base font-light"
                aria-label="الشهر السابق"
              >
                ›
              </button>
            </div>

            {/* Year picker */}
            {showYearPicker && (
              <div className="px-3 py-3 border-b border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={() => setYearRangeStart((s) => s + 15)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-soft)] text-sm">‹</button>
                  <span className="text-xs font-bold text-[var(--text-muted)]">{yearRangeStart} – {yearRangeStart + 14}</span>
                  <button type="button" onClick={() => setYearRangeStart((s) => s - 15)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-soft)] text-sm">›</button>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: 15 }, (_, i) => {
                    const yr = yearRangeStart + i;
                    const isCurrent = yr === viewYear;
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => { setViewYear(yr); setShowYearPicker(false); }}
                        className={cn(
                          "py-1.5 rounded-lg text-xs font-semibold transition-colors",
                          isCurrent ? "bg-[var(--primary)] text-white" : "text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
                        )}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Day headers */}
            <div className="grid grid-cols-7 px-1.5 pt-2 pb-0.5">
              {AR_DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-black text-[var(--text-muted)] py-0.5">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-0 px-1.5 pb-1.5">
              {gridCells.map((cell, i) => {
                const isToday = sameDay(cell.date, today);
                const isSelected = selected ? sameDay(cell.date, selected) : false;
                const isDis = isDisabled(cell.date) || cell.month !== "cur";
                const isOther = cell.month !== "cur";

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => !isDis && pickDay(cell)}
                    disabled={isDis}
                    className={cn(
                      "relative h-8 w-full flex items-center justify-center rounded-lg text-xs font-semibold transition-all duration-100",
                      isSelected && "bg-[var(--primary)] text-white font-black shadow-sm",
                      !isSelected && isToday && "text-[var(--primary)] font-black ring-2 ring-[var(--primary)]/30 ring-inset",
                      !isSelected && !isToday && !isOther && "text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
                      isOther && "text-[var(--text-muted)] opacity-40 cursor-default",
                      isDis && !isOther && "opacity-30 cursor-not-allowed",
                    )}
                  >
                    {cell.day}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--primary)]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border)] bg-[var(--surface-soft)]">
              <button
                type="button"
                onClick={() => { onChange?.(null); setOpen(false); }}
                className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--danger)]/8"
              >
                محو
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange?.(formatISO(today));
                  setOpen(false);
                }}
                className="text-xs font-bold text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors px-2 py-1 rounded-lg hover:bg-[var(--primary)]/8"
              >
                اليوم
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Keep legacy forwardRef export for backwards compat (wraps new component)
export type { DatePickerProps as LegacyDatePickerProps };
DatePicker.displayName = "DatePicker";
