"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import { Send, CalendarDays, Megaphone, Pin } from "@/lib/icons";
import { fetchWithAuthorizedSession } from "@/lib/authorized-api";

// Animated counter component
function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (v) => Math.floor(v).toLocaleString("ar-IQ-u-nu-latn"));

  useEffect(() => {
    mv.set(value);
  }, [mv, value]);

  return <motion.span>{display}</motion.span>;
}

interface Props {
  schoolId: string;
  refreshKey?: number;
}

interface Stats {
  totalSent: number;
  totalThisWeek: number;
  totalAnnouncements: number;
  totalPinned: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export function NotificationStatsCards({ schoolId, refreshKey }: Props) {
  const t = useTranslations("notifications.stats");
  const [stats, setStats] = useState<Stats>({
    totalSent: 0,
    totalThisWeek: 0,
    totalAnnouncements: 0,
    totalPinned: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const [notifRes, announcRes] = await Promise.all([
          fetchWithAuthorizedSession(
            `/api/web/notifications/insite?view=history&schoolId=${schoolId}&pageSize=1`,
          ),
          fetchWithAuthorizedSession(
            `/api/web/announcements?schoolId=${schoolId}&pageSize=50`,
          ),
        ]);

        const notifData = notifRes.ok ? await notifRes.json() : null;
        const announcData = announcRes.ok ? await announcRes.json() : null;

        const allItems: Array<{ createdAt?: string; status?: string }> =
          notifData?.items ?? [];
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thisWeek = allItems.filter(
          (i) => i.createdAt && new Date(i.createdAt) >= oneWeekAgo,
        ).length;

        const announcements: Array<{ isPinned?: boolean }> =
          announcData?.items ?? [];

        setStats({
          totalSent: notifData?.totalCount ?? 0,
          totalThisWeek: thisWeek,
          totalAnnouncements: announcData?.totalCount ?? 0,
          totalPinned: announcements.filter((a) => a.isPinned).length,
        });
      } catch {
        // silent
      }
    }
    void load();
  }, [schoolId, refreshKey]);

  const cards = [
    {
      icon: Send,
      label: t("totalSent"),
      sublabel: "إجمالي الإشعارات المرسلة",
      value: stats.totalSent,
      color: "var(--primary)",
    },
    {
      icon: CalendarDays,
      label: t("thisWeek"),
      sublabel: "خلال آخر 7 أيام",
      value: stats.totalThisWeek,
      color: "var(--success)",
    },
    {
      icon: Megaphone,
      label: t("announcements"),
      sublabel: "إعلانات منشورة",
      value: stats.totalAnnouncements,
      color: "var(--warning)",
    },
    {
      icon: Pin,
      label: t("pinned"),
      sublabel: "إعلانات مثبّتة",
      value: stats.totalPinned,
      color: "var(--danger)",
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
                {/* Icon */}
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{
                    background: `color-mix(in srgb, ${card.color} 12%, transparent)`,
                    color: card.color,
                  }}
                >
                  <Icon size={20} />
                </div>
                {/* Value */}
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
