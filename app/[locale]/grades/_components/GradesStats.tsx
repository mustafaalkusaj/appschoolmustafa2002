"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  FileEdit,
  CheckCircle2,
  Lock,
  TrendingUp,
  Users,
} from "lucide-react";
import type { GradeStats } from "../_types";

interface GradesStatsProps {
  stats: GradeStats;
  loading: boolean;
}

interface StatCardDef {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  description?: string;
}

function StatCard({ card, index }: { card: StatCardDef; index: number }) {
  const Icon = card.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
    >
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
          <span className="text-2xl font-black leading-none tabular-nums text-[var(--text-primary)]">
            {card.value}
          </span>
        </div>
        <div>
          <div className="text-sm font-bold text-[var(--text-primary)]">{card.label}</div>
          {card.description && (
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{card.description}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 animate-pulse"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--surface-soft)]" />
        <div className="h-7 w-12 rounded-lg bg-[var(--surface-soft)]" />
      </div>
      <div className="h-4 w-24 rounded bg-[var(--surface-soft)]" />
    </div>
  );
}

export function GradesStats({ stats, loading }: GradesStatsProps) {
  const v = (n: number) => (loading ? "..." : String(n));

  const row1: StatCardDef[] = [
    {
      label: "إجمالي الدرجات",
      value: v(stats.total),
      icon: BookOpen,
      color: "var(--primary)",
    },
    {
      label: "مسودة",
      value: v(stats.draft),
      icon: FileEdit,
      color: "var(--text-muted)",
    },
    {
      label: "مؤكدة",
      value: v(stats.confirmed),
      icon: CheckCircle2,
      color: "var(--info, #3b82f6)",
    },
    {
      label: "مقفولة",
      value: v(stats.locked),
      icon: Lock,
      color: "var(--warning, #f59e0b)",
    },
  ];

  const row2: StatCardDef[] = [
    {
      label: "متوسط النسبة",
      value: loading ? "..." : `${stats.avgPercentage}%`,
      icon: TrendingUp,
      color: "var(--success)",
      description: "النسبة المئوية لجميع الدرجات",
    },
    {
      label: "ناجح / راسب",
      value: loading ? "..." : `${stats.passCount} / ${stats.failCount}`,
      icon: Users,
      color: "var(--primary)",
      description: "الطلاب الناجحون مقابل الراسبين",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} index={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => <SkeletonCard key={i} index={i + 4} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {row1.map((card, i) => (
          <StatCard key={card.label} card={card} index={i} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {row2.map((card, i) => (
          <StatCard key={card.label} card={card} index={i + 4} />
        ))}
      </div>
    </div>
  );
}
