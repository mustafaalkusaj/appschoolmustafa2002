"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";
import { cn } from "@/lib/brand/brand-utils";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface TimePickerProps {
  value: string; // "HH:mm" 24h format
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseTime(val: string): { h: number; m: number } {
  const [hStr, mStr] = (val || "00:00").split(":");
  return { h: parseInt(hStr, 10) || 0, m: parseInt(mStr, 10) || 0 };
}

function formatDisplay(val: string): string {
  if (!val) return "";
  const { h, m } = parseTime(val);
  const period = h >= 12 ? "م" : "ص";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${pad(m)} ${period}`;
}

/* ── ScrollColumn ──────────────────────────────────────────────────────────── */

function ScrollColumn({
  items,
  selected,
  onSelect,
  label,
}: {
  items: { value: number; display: string }[];
  selected: number;
  onSelect: (v: number) => void;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const el = itemRefs.current.get(selected);
    if (el && containerRef.current) {
      el.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [selected]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
        {label}
      </span>
      <div
        ref={containerRef}
        className="h-[180px] w-[52px] overflow-y-auto rounded-lg bg-[var(--surface-soft)] border border-[var(--border)]"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="py-2 flex flex-col items-center gap-0.5">
          {items.map((item) => {
            const active = item.value === selected;
            return (
              <button
                key={item.value}
                ref={(el) => {
                  if (el) itemRefs.current.set(item.value, el);
                }}
                type="button"
                onClick={() => onSelect(item.value)}
                className={cn(
                  "w-10 h-8 rounded-md text-sm font-bold transition-all duration-150 flex items-center justify-center flex-shrink-0",
                  active
                    ? "bg-[var(--primary)] text-white shadow-sm scale-105"
                    : "text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]",
                )}
              >
                {item.display}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── TimePicker ────────────────────────────────────────────────────────────── */

const DROPDOWN_HEIGHT = 320;

export function TimePicker({ value, onChange, className, disabled, placeholder }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 220 });
  // Use current time for scroll position when value is empty
  const now = useRef(new Date());
  const hasValue = !!value;
  const { h, m } = hasValue ? parseTime(value) : { h: now.current.getHours(), m: now.current.getMinutes() };

  const isPM = h >= 12;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;

  const setHour12 = useCallback(
    (newH12: number) => {
      const h24 = isPM ? (newH12 === 12 ? 12 : newH12 + 12) : newH12 === 12 ? 0 : newH12;
      onChange(`${pad(h24)}:${pad(m)}`);
    },
    [isPM, m, onChange],
  );

  const setMinute = useCallback(
    (newM: number) => {
      onChange(`${pad(h)}:${pad(newM)}`);
    },
    [h, onChange],
  );

  const togglePeriod = useCallback(() => {
    const newH = isPM ? h - 12 : h + 12;
    onChange(`${pad(newH)}:${pad(m)}`);
  }, [isPM, h, m, onChange]);

  // Position dropdown relative to trigger via portal (fixed positioning)
  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < DROPDOWN_HEIGHT && rect.top > DROPDOWN_HEIGHT;

    setPos({
      top: openAbove ? rect.top - DROPDOWN_HEIGHT - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 220),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
  }, [open, updatePos]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Reposition on scroll
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => updatePos();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [open, updatePos]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const hours = Array.from({ length: 12 }, (_, i) => ({
    value: i === 0 ? 12 : i,
    display: String(i === 0 ? 12 : i),
  }));

  const minutes = Array.from({ length: 60 }, (_, i) => ({
    value: i,
    display: pad(i),
  }));

  return (
    <div className={cn("relative", className)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2 h-[var(--input-height)] rounded-[var(--input-radius)]",
          "border bg-[var(--surface-soft)]",
          "px-3 text-sm",
          "border-[var(--input-border)]",
          "transition-all duration-150",
          "hover:border-[var(--border-strong)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2",
          disabled && "opacity-50 cursor-not-allowed",
          open && "border-[var(--input-border-focus)] ring-2 ring-[var(--focus-ring-color)] ring-offset-2",
        )}
      >
        <Clock className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
        <span className={cn("flex-1 text-start", value ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-tertiary)]")}>
          {value ? formatDisplay(value) : placeholder || "اختر الوقت"}
        </span>
      </button>

      {/* Dropdown — portaled to body */}
      {open && !disabled && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="z-[9999] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-3 animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              minWidth: `${pos.width}px`,
            }}
          >
            {/* Period toggle */}
            <div className="flex items-center justify-center gap-1 mb-3">
              <button
                type="button"
                onClick={() => { if (isPM) togglePeriod(); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                  !isPM
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] border border-[var(--border)]",
                )}
              >
                صباحاً
              </button>
              <button
                type="button"
                onClick={() => { if (!isPM) togglePeriod(); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                  isPM
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] border border-[var(--border)]",
                )}
              >
                مساءً
              </button>
            </div>

            {/* Display */}
            <div className="text-center mb-3">
              <span className="text-2xl font-black text-[var(--text-primary)] tabular-nums tracking-wider">
                {h12}:{pad(m)}
              </span>
              <span className="text-sm font-bold text-[var(--primary)] ms-2">
                {isPM ? "م" : "ص"}
              </span>
            </div>

            {/* Columns */}
            <div className="flex items-start justify-center gap-3">
              <ScrollColumn items={hours} selected={h12} onSelect={setHour12} label="ساعة" />
              <ScrollColumn items={minutes} selected={m} onSelect={setMinute} label="دقيقة" />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
