"use client";
import { useState, useEffect } from "react";

const SECTIONS = [
  { id: "sec-hero",              icon: "◉", label: "الرئيسية" },
  { id: "sec-alerts",            icon: "⚡", label: "التنبيهات" },
  { id: "sec-branches",          icon: "⊞", label: "الفروع" },
  { id: "sec-trend",             icon: "↗", label: "الترند" },
  { id: "sec-analysis",          icon: "◎", label: "التحليل" },
  { id: "sec-discount",          icon: "%", label: "الخصومات" },
  { id: "sec-finance",           icon: "$", label: "المالية" },
  { id: "sec-teachers-analytics",icon: "✦", label: "الكادر" },
  { id: "sec-salaries",          icon: "₪", label: "الرواتب" },
  { id: "sec-teachers",          icon: "☰", label: "الأساتذة" },
  { id: "sec-summary",           icon: "∑", label: "الملخص" },
];

export function GroupSectionNav() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { threshold: 0.2, rootMargin: "-20% 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="fixed start-3 top-1/2 z-50 -translate-y-1/2 flex flex-col gap-1">
      {SECTIONS.map((s) => {
        const isActive = activeId === s.id;
        return (
          <button
            key={s.id}
            onClick={() => handleClick(s.id)}
            title={s.label}
            className={`flex items-center justify-center rounded-md border-0 font-bold shadow-sm transition-all duration-200 cursor-pointer ${
              isActive
                ? "h-7 w-7 bg-blue-600 text-white text-[11px]"
                : "h-5 w-5 bg-white text-gray-400 text-[9px]"
            }`}
          >
            {s.icon}
          </button>
        );
      })}
    </div>
  );
}
