"use client";

// Teachers statistics section

import { BookOpen } from "@/lib/icons";
import type { TeacherStatsItem } from "../_types";

type TeachersStatsProps = {
  stats: TeacherStatsItem[];
};

export function TeachersStats({ stats }: TeachersStatsProps) {
  return (
    <section className="grid gap-3 xl:grid-cols-4">
      {stats.map((item) => (
        <article key={item.label} className="ui-soft-surface rounded-[24px] p-4">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]">
            <BookOpen size={18} />
          </div>
          <p className="text-xs font-black text-[var(--text-secondary)]">{item.label}</p>
          <div className="mt-2 text-2xl font-black text-[var(--text-primary)]">{item.value}</div>
          <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{item.hint}</p>
        </article>
      ))}
    </section>
  );
}
