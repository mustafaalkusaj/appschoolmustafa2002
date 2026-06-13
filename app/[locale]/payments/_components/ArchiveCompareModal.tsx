"use client";

import { useMemo } from "react";
import { formatNumber } from "@/lib/formatting";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { PaymentArchive, Student } from "../_types";
import { getArchiveStudents } from "../_hooks/useArchiveOperations";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ArchiveCompareModalProps {
  archiveA: PaymentArchive | null;
  archiveB: PaymentArchive | null;
  show: boolean;
  onClose: () => void;
}

type DeltaDir = "up" | "down" | "same";

function delta(a: number, b: number): { dir: DeltaDir; pct: number; abs: number } {
  const abs = b - a;
  const pct = a > 0 ? Math.round((abs / a) * 100) : 0;
  return { dir: abs > 0 ? "up" : abs < 0 ? "down" : "same", pct, abs };
}

function DeltaBadge({ dir, pct }: { dir: DeltaDir; pct: number }) {
  if (dir === "same") return <Minus className="h-4 w-4 text-[var(--text-muted)]" />;
  const Icon = dir === "up" ? TrendingUp : TrendingDown;
  const color = dir === "up" ? "var(--success)" : "var(--danger)";
  return (
    <span className="flex items-center gap-1 text-xs font-bold" style={{ color }}>
      <Icon className="h-3.5 w-3.5" />
      {dir === "up" ? "+" : ""}{pct}%
    </span>
  );
}

function StatRow({
  label,
  valA,
  valB,
  currency,
  deltaDir,
  invertColor,
}: {
  label: string;
  valA: number;
  valB: number;
  currency?: string;
  deltaDir: DeltaDir;
  invertColor?: boolean;
}) {
  const fmt = (n: number) => (currency ? `${currency} ${formatNumber(n)}` : formatNumber(n));
  // For "remaining" — decrease is good
  const effectiveDir: DeltaDir = invertColor
    ? deltaDir === "up" ? "down" : deltaDir === "down" ? "up" : "same"
    : deltaDir;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
      {/* Year A */}
      <div className="text-end">
        <p className="text-sm font-bold text-[var(--text-primary)]">{fmt(valA)}</p>
      </div>

      {/* Label + delta */}
      <div className="flex flex-col items-center gap-1 min-w-[120px]">
        <span className="text-xs font-semibold text-[var(--text-muted)] text-center">{label}</span>
        <DeltaBadge dir={effectiveDir} pct={Math.abs(delta(valA, valB).pct)} />
      </div>

      {/* Year B */}
      <div className="text-start">
        <p className="text-sm font-bold text-[var(--text-primary)]">{fmt(valB)}</p>
      </div>
    </div>
  );
}

function computeStats(archive: PaymentArchive) {
  const students = getArchiveStudents(archive) as Student[];
  const total = students.length;
  const totalFee = students.reduce((s, st) => s + (Number(st.total_fee) || 0), 0);
  const paid = students.reduce((s, st) => s + (Number(st.paid_fee) || 0), 0);
  const remaining = students.reduce((s, st) => s + (Number(st.remaining_fee) || 0), 0);
  const collected = students.filter((st) => (Number(st.remaining_fee) || 0) <= 0).length;
  const rate = totalFee > 0 ? Math.round((paid / totalFee) * 100) : 0;
  const totalPayments = archive.total_payments ?? 0;
  return { total, totalFee, paid, remaining, collected, rate, totalPayments };
}

function studentOverlap(archiveA: PaymentArchive, archiveB: PaymentArchive) {
  const studentsA = getArchiveStudents(archiveA) as Student[];
  const studentsB = getArchiveStudents(archiveB) as Student[];
  const namesA = new Set(studentsA.map((s) => s.full_name?.trim().toLowerCase()).filter(Boolean));
  const namesB = new Set(studentsB.map((s) => s.full_name?.trim().toLowerCase()).filter(Boolean));
  const arrA = Array.from(namesA);
  const arrB = Array.from(namesB);
  const common = arrA.filter((n) => namesB.has(n)).length;
  const onlyInA = arrA.filter((n) => !namesB.has(n)).length;
  const onlyInB = arrB.filter((n) => !namesA.has(n)).length;
  return { common, onlyInA, onlyInB };
}

export function ArchiveCompareModal({
  archiveA,
  archiveB,
  show,
  onClose,
}: ArchiveCompareModalProps) {
  const statsA = useMemo(() => (archiveA ? computeStats(archiveA) : null), [archiveA]);
  const statsB = useMemo(() => (archiveB ? computeStats(archiveB) : null), [archiveB]);
  const overlap = useMemo(
    () => (archiveA && archiveB ? studentOverlap(archiveA, archiveB) : null),
    [archiveA, archiveB],
  );

  if (!archiveA || !archiveB || !statsA || !statsB) return null;

  const currency = "د.ع";
  const yearA = archiveA.archive_year;
  const yearB = archiveB.archive_year;

  // Ensure A is the older year visually
  const [leftYear, leftStats, rightYear, rightStats] =
    yearA <= yearB
      ? [yearA, statsA, yearB, statsB]
      : [yearB, statsB, yearA, statsA];

  const rows: Array<{
    label: string;
    valA: number;
    valB: number;
    currency?: string;
    invertColor?: boolean;
  }> = [
    { label: "عدد الطلاب",       valA: leftStats.total,        valB: rightStats.total },
    { label: "إجمالي الرسوم",    valA: leftStats.totalFee,     valB: rightStats.totalFee,    currency },
    { label: "المبالغ المدفوعة", valA: leftStats.paid,         valB: rightStats.paid,        currency },
    { label: "المتبقي",          valA: leftStats.remaining,    valB: rightStats.remaining,   currency, invertColor: true },
    { label: "الطلاب المستوفون", valA: leftStats.collected,    valB: rightStats.collected },
    { label: "نسبة التحصيل",     valA: leftStats.rate,         valB: rightStats.rate },
    { label: "عدد الدفعات",      valA: leftStats.totalPayments, valB: rightStats.totalPayments },
  ];

  return (
    <Modal open={show} onClose={onClose} size="lg">
      <ModalHeader
        title="مقارنة الأرشيفات"
        description={`${leftYear} مقابل ${rightYear}`}
        onClose={onClose}
      />
      <ModalBody className="space-y-6">
        {/* Year headers */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
          <div className="text-end">
            <span className="inline-block px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] text-white text-sm font-black">
              {leftYear}
            </span>
          </div>
          <div className="min-w-[120px]" />
          <div className="text-start">
            <span className="inline-block px-3 py-1.5 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)] text-sm font-black">
              {rightYear}
            </span>
          </div>
        </div>

        {/* Stat rows */}
        <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] px-4">
          {rows.map((row) => {
            const d = delta(row.valA, row.valB);
            return (
              <StatRow
                key={row.label}
                label={row.label}
                valA={row.valA}
                valB={row.valB}
                currency={row.currency}
                deltaDir={d.dir}
                invertColor={row.invertColor}
              />
            );
          })}
        </div>

        {/* Student overlap */}
        {overlap && (
          <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 space-y-3">
            <p className="text-sm font-bold text-[var(--text-primary)]">تحليل الطلاب</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-soft)] p-3">
                <p className="text-lg font-black text-[var(--text-primary)]">{formatNumber(overlap.common)}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">طلاب مشتركون</p>
              </div>
              <div className="rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-3">
                <p className="text-lg font-black text-[var(--danger)]">{formatNumber(overlap.onlyInA)}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">غادروا بعد {leftYear}</p>
              </div>
              <div className="rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] p-3">
                <p className="text-lg font-black text-[var(--success)]">{formatNumber(overlap.onlyInB)}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">انضموا في {rightYear}</p>
              </div>
            </div>
          </div>
        )}

        {/* Collection rate visual comparison */}
        <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 space-y-3">
          <p className="text-sm font-bold text-[var(--text-primary)]">نسبة التحصيل</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--text-muted)] w-10 text-end">{leftYear}</span>
              <div className="flex-1 h-3 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${leftStats.rate}%`, background: "var(--primary)" }}
                />
              </div>
              <Badge variant={leftStats.rate >= 75 ? "success" : leftStats.rate >= 50 ? "warning" : "danger"} size="sm">
                {leftStats.rate}%
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--text-muted)] w-10 text-end">{rightYear}</span>
              <div className="flex-1 h-3 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${rightStats.rate}%`, background: "var(--primary)" }}
                />
              </div>
              <Badge variant={rightStats.rate >= 75 ? "success" : rightStats.rate >= 50 ? "warning" : "danger"} size="sm">
                {rightStats.rate}%
              </Badge>
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
