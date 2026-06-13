"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/formatting";
import { Badge } from "@/components/ui/badge";
import { PaymentArchive, Student } from "../_types";
import { getArchiveStudents, getArchivePayments } from "../_hooks/useArchiveOperations";
import { Search, User, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StudentArchiveSearchProps {
  archives: PaymentArchive[];
  currentStudents?: Student[];
  currentYear?: number;
}

type YearRecord = {
  year: number;
  isCurrentYear: boolean;
  student: Student;
  paymentCount: number;
};

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function collectionRate(s: Student) {
  const eff = Math.max((s.total_fee ?? 0) - (s.discount_value ?? 0), 0);
  return eff > 0 ? Math.round(((s.paid_fee ?? 0) / eff) * 100) : 0;
}

export function StudentArchiveSearch({
  archives,
  currentStudents = [],
  currentYear,
}: StudentArchiveSearchProps) {
  const [query, setQuery] = useState("");

  // Build name → records index across all archives + current year
  const index = useMemo(() => {
    const map = new Map<string, YearRecord[]>();

    // Current year students
    if (currentStudents.length > 0 && currentYear) {
      for (const s of currentStudents) {
        const key = normalize(s.full_name ?? "");
        if (!key) continue;
        const arr = map.get(key) ?? [];
        arr.push({ year: currentYear, isCurrentYear: true, student: s, paymentCount: 0 });
        map.set(key, arr);
      }
    }

    // Archived students
    for (const archive of archives) {
      const students = getArchiveStudents(archive) as Student[];
      const payments = getArchivePayments(archive);
      const countByStudent: Record<string, number> = {};
      for (const p of payments) {
        countByStudent[p.student_id] = (countByStudent[p.student_id] ?? 0) + 1;
      }

      for (const s of students) {
        const key = normalize(s.full_name ?? "");
        if (!key) continue;
        const arr = map.get(key) ?? [];
        arr.push({
          year: archive.archive_year,
          isCurrentYear: false,
          student: s,
          paymentCount: countByStudent[s.id] ?? 0,
        });
        map.set(key, arr);
      }
    }

    return map;
  }, [archives, currentStudents, currentYear]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (q.length < 2) return [];

    const matched: Array<{ name: string; records: YearRecord[] }> = [];
    for (const [name, records] of Array.from(index.entries())) {
      if (name.includes(q)) {
        const sorted = [...records].sort((a, b) => b.year - a.year);
        matched.push({ name, records: sorted });
      }
    }
    // Sort by relevance (exact match first)
    matched.sort((a, b) => {
      const aExact = a.name === q ? -1 : 0;
      const bExact = b.name === q ? -1 : 0;
      return aExact - bExact || a.name.localeCompare(b.name);
    });
    return matched.slice(0, 8);
  }, [query, index]);

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن طالب عبر جميع السنوات..."
          className="w-full h-10 ps-9 pe-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
        />
      </div>

      {query.length >= 2 && results.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] text-center py-3">
          لا توجد نتائج لـ "{query}"
        </p>
      )}

      {results.map(({ name, records }) => (
        <div
          key={name}
          className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden"
        >
          {/* Student header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface-soft)] border-b border-[var(--border)]">
            <User className="h-4 w-4 text-[var(--primary)]" />
            <span className="font-black text-[var(--text-primary)] text-sm">
              {records[0]?.student.full_name}
            </span>
            <span className="text-xs text-[var(--text-muted)] ms-auto">
              {records.length} سنة في السجلات
            </span>
          </div>

          {/* Year rows */}
          <div className="divide-y divide-[var(--border)]">
            {records.map((rec, i) => {
              const rate = collectionRate(rec.student);
              const prevRec = records[i + 1];
              const prevRate = prevRec ? collectionRate(prevRec.student) : null;
              const rateDelta = prevRate !== null ? rate - prevRate : null;

              return (
                <div
                  key={rec.year}
                  className="grid grid-cols-[80px_1fr_1fr_1fr_80px_60px] items-center gap-2 px-4 py-2.5 text-xs"
                >
                  {/* Year */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-black text-sm ${
                        rec.isCurrentYear ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {rec.year}
                    </span>
                    {rec.isCurrentYear && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                        حالي
                      </span>
                    )}
                  </div>

                  {/* Class */}
                  <span className="text-[var(--text-muted)] truncate">{rec.student.class_name || "—"}</span>

                  {/* Total */}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatNumber(rec.student.total_fee ?? 0)}
                  </span>

                  {/* Paid */}
                  <span className="font-semibold text-[var(--success)]">
                    {formatNumber(rec.student.paid_fee ?? 0)}
                  </span>

                  {/* Rate */}
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={rate >= 75 ? "success" : rate >= 50 ? "warning" : "danger"}
                      size="sm"
                    >
                      {rate}%
                    </Badge>
                    {rateDelta !== null && (
                      rateDelta > 0
                        ? <TrendingUp className="h-3 w-3 text-[var(--success)]" />
                        : rateDelta < 0
                        ? <TrendingDown className="h-3 w-3 text-[var(--danger)]" />
                        : <Minus className="h-3 w-3 text-[var(--text-muted)]" />
                    )}
                  </div>

                  {/* Payment count */}
                  <span className="text-[var(--text-muted)] text-end">
                    {rec.paymentCount > 0 ? `${rec.paymentCount} دفعة` : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar for latest year */}
          {records[0] && (
            <div className="px-4 py-2 bg-[var(--surface-muted)]">
              <div className="h-1.5 bg-[var(--surface-soft)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${collectionRate(records[0].student)}%`,
                    background: collectionRate(records[0].student) >= 100 ? "var(--success)" : "var(--primary)",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
