"use client";

import { useEffect, useState } from "react";

interface ExamCountdownProps {
  examDate: string;
  subjectName: string;
  isAr?: boolean;
}

function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    expired: false,
  };
}

export function ExamCountdown({ examDate, subjectName, isAr }: ExamCountdownProps) {
  const [time, setTime] = useState(() => getTimeLeft(examDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeLeft(examDate));
    }, 60000);
    return () => clearInterval(interval);
  }, [examDate]);

  if (time.expired) return null;

  const t = (ar: string, en: string) => (isAr ? ar : en);

  const urgency =
    time.days <= 1
      ? "var(--danger)"
      : time.days <= 3
        ? "var(--warning)"
        : "var(--info)";

  return (
    <div
      className="flex items-center gap-3 rounded-xl p-3 border"
      style={{
        borderColor: `color-mix(in srgb, ${urgency} 25%, transparent)`,
        background: `color-mix(in srgb, ${urgency} 5%, transparent)`,
      }}
    >
      <div className="flex gap-1.5 shrink-0">
        {[
          { val: time.days, label: t("يوم", "d") },
          { val: time.hours, label: t("ساعة", "h") },
          { val: time.minutes, label: t("دقيقة", "m") },
        ].map((unit, i) => (
          <div
            key={i}
            className="flex flex-col items-center rounded-lg px-2 py-1 min-w-[36px]"
            style={{
              background: `color-mix(in srgb, ${urgency} 12%, transparent)`,
            }}
          >
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: urgency }}
            >
              {String(unit.val).padStart(2, "0")}
            </span>
            <span className="text-[9px] font-medium" style={{ color: urgency }}>
              {unit.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {subjectName}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {time.days <= 1
            ? t("قريب جداً!", "Very soon!")
            : t(`بعد ${time.days} يوم`, `In ${time.days} days`)}
        </p>
      </div>
    </div>
  );
}
