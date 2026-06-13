"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Users, UserCheck, CalendarDays, GraduationCap } from "@/lib/icons";
import type { TeacherRecord } from "../_types";

function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = rounded.on("change", setDisplay);
    return unsub;
  }, [rounded]);

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 0.7, ease: "easeOut" });
    return controls.stop;
  }, [value, motionVal]);

  return <span>{display}</span>;
}

interface Props {
  teachers: TeacherRecord[];
  locale: "ar" | "en";
}

export function TeachersStats({ teachers, locale }: Props) {
  const isEn = locale === "en";
  const total = teachers.length;
  const active = teachers.filter((t) => t.status === "active").length;
  const onLeave = teachers.filter((t) => t.status === "on_leave").length;
  const appActive = teachers.filter((t) => t.app_status === "active").length;
  const fullTime = teachers.filter((t) => t.contract_type === "full_time").length;
  const avgExp = teachers.length
    ? Math.round(teachers.reduce((s, t) => s + (t.years_experience ?? 0), 0) / teachers.length)
    : 0;
  const activePct = total ? Math.round((active / total) * 100) : 0;

  const stats = [
    {
      label: isEn ? "Total Staff" : "إجمالي الكادر",
      value: total,
      sub: isEn ? `${fullTime} full-time` : `${fullTime} دوام كامل`,
      icon: Users,
      color: "var(--primary)",
      pct: null as number | null,
    },
    {
      label: isEn ? "Active" : "فعّالون",
      value: active,
      sub: isEn ? `${activePct}% of staff` : `${activePct}% من الكادر`,
      icon: UserCheck,
      color: "var(--success)",
      pct: activePct,
    },
    {
      label: isEn ? "On Leave" : "في إجازة",
      value: onLeave,
      sub: isEn ? "temporarily absent" : "غائب مؤقتاً",
      icon: CalendarDays,
      color: "var(--warning)",
      pct: null,
    },
    {
      label: isEn ? "App Accounts" : "حسابات التطبيق",
      value: appActive,
      sub: isEn ? `avg ${avgExp}y exp` : `متوسط خبرة ${avgExp} سنة`,
      icon: GraduationCap,
      color: "var(--info)",
      pct: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.25 }}
            className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
              style={{ background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${s.color} 8%, transparent), transparent 70%)` }}
            />

            <div className="relative flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color }}
                >
                  <Icon size={20} />
                </div>
                <span
                  className="text-3xl font-black leading-none tabular-nums"
                  style={{ color: s.color }}
                >
                  <AnimatedNumber value={s.value} />
                </span>
              </div>

              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">{s.label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.sub}</div>
              </div>

              {s.pct !== null && (
                <div className="h-1 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${s.pct}%`, background: s.color }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
