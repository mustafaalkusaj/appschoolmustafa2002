"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { School, Layers, Users, GraduationCap } from "@/lib/icons";

interface ClassesStatsProps {
  classesCount: number;
  sectionsCount: number;
  studentsCount: number;
  locale: "ar" | "en";
}

function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = rounded.on("change", setDisplay);
    return unsubscribe;
  }, [rounded]);

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 0.7, ease: "easeOut" });
    return controls.stop;
  }, [value, motionVal]);

  return <span>{display}</span>;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export function ClassesStats({ classesCount, sectionsCount, studentsCount, locale }: ClassesStatsProps) {
  const isEn = locale === "en";

  const avgSections = classesCount > 0 ? Math.round((sectionsCount / classesCount) * 10) / 10 : 0;

  const cards = [
    {
      icon: School,
      label: isEn ? "Total Classes" : "إجمالي الصفوف",
      sublabel: isEn ? "Active class groups" : "مجموعات الصفوف النشطة",
      value: classesCount,
      color: "var(--primary)",
    },
    {
      icon: Layers,
      label: isEn ? "Total Sections" : "إجمالي الشعب",
      sublabel: isEn ? "Across all classes" : "عبر جميع الصفوف",
      value: sectionsCount,
      color: "var(--success)",
    },
    {
      icon: Users,
      label: isEn ? "Total Students" : "إجمالي الطلاب",
      sublabel: isEn ? "Enrolled students" : "الطلاب المسجلون",
      value: studentsCount,
      color: "var(--warning)",
    },
    {
      icon: GraduationCap,
      label: isEn ? "Avg Sections/Class" : "متوسط الشعب/الصف",
      sublabel: isEn ? "Distribution ratio" : "نسبة التوزيع",
      value: avgSections,
      color: "#06b6d4",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
          >
            {/* Hover radial gradient */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
              style={{
                background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${card.color} 8%, transparent), transparent 70%)`,
              }}
            />
            <div className="relative flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{
                    background: `color-mix(in srgb, ${card.color} 12%, transparent)`,
                    color: card.color,
                  }}
                >
                  <Icon size={20} />
                </div>
                <span
                  className="text-3xl font-black leading-none tabular-nums"
                  style={{ color: card.color }}
                >
                  <AnimatedNumber value={card.value} />
                </span>
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">{card.label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{card.sublabel}</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
