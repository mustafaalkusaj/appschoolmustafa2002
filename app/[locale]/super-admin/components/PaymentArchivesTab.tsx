"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, RefreshCw, Trash2, Building2, Search } from "@/lib/icons";
import { fetchWithAuthorizedSession } from "@/lib/authorized-api";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SectionCard, EmptyState, MigrationNotice, formatDate } from "./UI";

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
  return n.toLocaleString("ar-IQ");
}

const MAX_PER_BRANCH = 5;

// Group archives by school_id + branch_id (branch_id not in select, group by school)
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
    ? archives.filter((a) => getSchoolName(a).toLowerCase().includes(query.toLowerCase()) || String(a.archive_year).includes(query))
    : archives;

  const groups = groupBySchool(filtered);

  return (
    <div className="space-y-6">
      {message && <MigrationNotice title="تنبيه" description={message} />}

      <SectionCard
        title="أرشيفات الحسابات السنوية"
        description={`إدارة أرشيفات الحسابات لكل مدرسة. الحد الأقصى ${MAX_PER_BRANCH} أرشيفات لكل فرع.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="بحث بالمدرسة أو السنة..."
                className="ui-input min-h-0 py-2 ps-9 text-xs"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="ui-button ui-button--secondary h-9 w-9 p-0"
              onClick={() => void fetchArchives()}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="space-y-3 py-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="sk h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : Object.keys(groups).length === 0 ? (
          <EmptyState
            icon={Archive}
            title="لا توجد أرشيفات"
            description="لم يتم إنشاء أي أرشيف سنوي للحسابات حتى الآن."
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([schoolId, schoolArchives]) => {
              const schoolName = getSchoolName(schoolArchives[0]);
              const isAtLimit = schoolArchives.length >= MAX_PER_BRANCH;
              return (
                <div key={schoolId} className="space-y-3">
                  {/* School header */}
                  <div className="flex items-center gap-3 px-1">
                    <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--surface-muted)]">
                      <Building2 size={16} className="text-[var(--text-tertiary)]" />
                    </div>
                    <div className="flex-1">
                      <span className="font-black text-[var(--text-primary)] text-sm">{schoolName}</span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isAtLimit
                          ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                          : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                      }`}
                    >
                      {schoolArchives.length} / {MAX_PER_BRANCH}
                      {isAtLimit ? " — وصل الحد الأقصى" : ""}
                    </span>
                  </div>

                  {/* Archive rows */}
                  <div className="grid gap-3 ms-11">
                    {schoolArchives.map((archive) => (
                      <div
                        key={archive.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]">
                            <Archive size={16} className="text-[var(--primary)]" />
                          </div>
                          <div>
                            <p className="font-black text-[var(--text-primary)] text-sm">
                              سنة {archive.archive_year}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              {archive.total_students ?? 0} طالب ·{" "}
                              {archive.total_payments ?? 0} دفعة ·{" "}
                              {formatAmount(archive.total_amount)} د.ع ·{" "}
                              {archive.archive_date ? formatDate(archive.archive_date) : "—"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setArchiveToDelete(archive)}
                          className="ui-button ui-button--danger inline-flex items-center gap-2 text-xs"
                        >
                          <Trash2 size={14} />
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

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
