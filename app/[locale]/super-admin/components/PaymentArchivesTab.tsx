"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, RefreshCw, Trash2, Building2, Search } from "@/lib/icons";
import { fetchWithAuthorizedSession } from "@/lib/authorized-api";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MigrationNotice, formatDate } from "./UI";

type PaymentArchiveRow = {
  id: string;
  school_id: string | null;
  archive_year: number;
  archive_date: string | null;
  total_students: number | null;
  total_payments: number | null;
  total_amount: number | null;
  schools?: { name: string | null } | Array<{ name: string | null }> | null;
};

function getSchoolName(row: PaymentArchiveRow): string {
  if (!row.schools) return row.school_id ?? "—";
  if (Array.isArray(row.schools)) return row.schools[0]?.name ?? "—";
  return row.schools.name ?? "—";
}

function formatAmount(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("ar-IQ-u-nu-latn");
}

const MAX_PER_BRANCH = 5;

function groupBySchool(archives: PaymentArchiveRow[]): Record<string, PaymentArchiveRow[]> {
  const groups: Record<string, PaymentArchiveRow[]> = {};
  for (const a of archives) {
    const key = a.school_id ?? "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }
  return groups;
}

export function PaymentArchivesTab() {
  const [archives, setArchives] = useState<PaymentArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [archiveToDelete, setArchiveToDelete] = useState<PaymentArchiveRow | null>(null);

  const fetchArchives = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuthorizedSession("/api/web/super-admin/payment-archives");
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error?.message || "تعذر تحميل الأرشيفات.");
      setArchives(Array.isArray(payload?.archives) ? payload.archives : []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "تعذر تحميل أرشيفات الحسابات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchArchives(); }, [fetchArchives]);

  const handleDelete = useCallback(async (archiveId: string) => {
    try {
      const res = await fetchWithAuthorizedSession(
        `/api/web/super-admin/payment-archives/${archiveId}`,
        { method: "DELETE" },
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error?.message || "تعذر حذف الأرشيف.");
      setMessage("");
      await fetchArchives();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "تعذر حذف الأرشيف.");
    }
  }, [fetchArchives]);

  const filtered = query
    ? archives.filter((a) =>
        getSchoolName(a).toLowerCase().includes(query.toLowerCase()) ||
        String(a.archive_year).includes(query)
      )
    : archives;

  const groups = groupBySchool(filtered);

  const grandTotal = useMemo(() => ({
    count: filtered.length,
    totalAmount: filtered.reduce((sum, a) => sum + (a.total_amount ?? 0), 0),
    totalPayments: filtered.reduce((sum, a) => sum + (a.total_payments ?? 0), 0),
  }), [filtered]);

  return (
    <div className="space-y-3">
      {message && <MigrationNotice title="تنبيه" description={message} />}

      {/* Compact header */}
      <div className="flex items-center justify-between pb-2 mb-0 border-b border-[var(--border)]">
        <span className="text-xs font-black text-[var(--text-primary)]">
          أرشيفات الحسابات السنوية
          <span className="ms-1 text-[10px] font-bold text-[var(--text-muted)]">(حد {MAX_PER_BRANCH} لكل فرع)</span>
        </span>
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search size={11} className="absolute start-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="بحث..."
              className="h-6 rounded border border-[var(--border)] bg-[var(--surface-muted)] ps-6 pe-2 text-[11px] outline-none focus:border-[var(--primary)]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={() => void fetchArchives()}
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="sk h-8 w-full rounded" />
          ))}
        </div>
      ) : Object.keys(groups).length === 0 ? (
        <p className="py-8 text-center text-xs text-[var(--text-muted)]">لا توجد بيانات</p>
      ) : (
        <div>
          {Object.entries(groups).map(([schoolId, schoolArchives]) => {
            const schoolName = getSchoolName(schoolArchives[0]);
            const isAtLimit = schoolArchives.length >= MAX_PER_BRANCH;
            return (
              <div key={schoolId}>
                {/* School separator */}
                <div className="flex items-center gap-1 py-1 border-b border-[var(--border)] bg-[var(--surface-muted)]">
                  <Building2 size={11} className="text-[var(--text-muted)] ms-2" />
                  <span className="text-[11px] font-black text-[var(--text-primary)]">{schoolName}</span>
                  <span
                    className={`ms-auto me-2 text-[10px] font-black px-1.5 py-0.5 rounded ${
                      isAtLimit
                        ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {schoolArchives.length}/{MAX_PER_BRANCH}
                    {isAtLimit ? " — وصل الحد" : ""}
                  </span>
                </div>

                {/* Archive rows */}
                {schoolArchives.map((archive) => (
                  <div
                    key={archive.id}
                    className="flex items-center gap-2 py-1.5 px-4 border-b border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors"
                  >
                    <Archive size={11} className="text-[var(--primary)] shrink-0" />
                    <span className="text-xs font-black text-[var(--text-primary)]">سنة {archive.archive_year}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {archive.total_students ?? 0} طالب ·{" "}
                      {archive.total_payments ?? 0} دفعة ·{" "}
                      {formatAmount(archive.total_amount)} د.ع ·{" "}
                      {archive.archive_date ? formatDate(archive.archive_date) : "—"}
                    </span>
                    <button
                      onClick={() => setArchiveToDelete(archive)}
                      className="ms-auto flex items-center gap-1 text-[10px] font-black text-[var(--danger)] hover:underline"
                    >
                      <Trash2 size={11} />
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Grand total footer */}
      {!loading && grandTotal.count > 0 && (
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 mt-1 text-xs font-black">
          <span className="text-[var(--text-muted)]">
            الإجمالي ({grandTotal.count} أرشيف · {grandTotal.totalPayments.toLocaleString("ar-IQ-u-nu-latn")} دفعة)
          </span>
          {grandTotal.totalAmount > 0 && (
            <span className="text-[var(--text-primary)]">
              {grandTotal.totalAmount.toLocaleString("ar-IQ-u-nu-latn")} د.ع
            </span>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(archiveToDelete)}
        title={`حذف أرشيف سنة ${archiveToDelete?.archive_year ?? "—"}؟`}
        description={
          archiveToDelete
            ? `سيتم حذف أرشيف حسابات سنة ${archiveToDelete.archive_year} الخاصة بمدرسة "${getSchoolName(archiveToDelete)}" نهائياً. لا يمكن التراجع عن هذه العملية.`
            : ""
        }
        confirmLabel="نعم، احذف الأرشيف"
        cancelLabel="إلغاء"
        tone="danger"
        onClose={() => setArchiveToDelete(null)}
        onConfirm={async () => {
          const target = archiveToDelete;
          setArchiveToDelete(null);
          if (target?.id) await handleDelete(target.id);
        }}
      />
    </div>
  );
}
