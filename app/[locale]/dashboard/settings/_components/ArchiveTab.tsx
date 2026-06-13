"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithAuthorizedSession, fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { formatDate, formatNumber } from "@/lib/formatting";
import {
  Archive, CalendarDays as Calendar, CreditCard, Download, Eye, ArrowLeftRight as GitCompareArrows,
  History, Search, Trash2, AlertTriangle, RefreshCw,
  Users, TrendingUp, Loader2, X, ChevronDown, ChevronUp, ExternalLink,
} from "@/lib/icons";
import { setArchiveModeData, setAvailableArchives } from "@/lib/archive-mode-store";
import { useRouter, usePathname } from "next/navigation";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { cn } from "@/lib/brand/brand-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Student = {
  id: string; full_name: string; class_name: string;
  phone?: string; total_fee: number; paid_fee: number;
  remaining_fee: number; status?: string;
};
type Payment = {
  id: string; student_id: string; amount: number;
  payment_method: string; notes?: string;
  receipt_number?: string; manual_receipt_number?: string;
  created_at: string;
};
type Archive = {
  id: string; archive_year: number; archive_date: string;
  total_students?: number; total_payments?: number; total_amount?: number;
  note?: string;
  data?: { students?: Student[]; payments?: Payment[] };
};

type PreviewData = { students: number; payments: number; totalAmount: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function methodLabel(m: string) {
  return ({ cash: "نقداً", bank_transfer: "تحويل بنكي", check: "شيك" } as Record<string, string>)[m] ?? m;
}
function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

const MAX = 5;

// ─── Main Component ───────────────────────────────────────────────────────────

export function ArchiveTab({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create archive
  const [archiveYear, setArchiveYear] = useState(String(new Date().getFullYear()));
  const [archiveNote, setArchiveNote] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveMsg, setArchiveMsg] = useState("");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Delete archive
  const [deleteTarget, setDeleteTarget] = useState<Archive | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Detail view
  const [detailArchive, setDetailArchive] = useState<Archive | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailTab, setDetailTab] = useState<"students" | "payments">("students");

  // Compare
  const [compareA, setCompareA] = useState<Archive | null>(null);
  const [compareB, setCompareB] = useState<Archive | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // Cross-year search
  const [crossSearch, setCrossSearch] = useState("");
  const [showCross, setShowCross] = useState(false);

  // Export
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);

  // Browse archive (global mode)
  const [browsingId, setBrowsingId] = useState<string | null>(null);

  const deleteInputRef = useRef<HTMLInputElement>(null);

  // ── Load archives ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        archives?: Archive[]; archiveNotice?: string; error?: { message?: string };
      }>(`/api/web/payments/meta?schoolId=${schoolId}`);
      if (!response.ok) throw new Error(payload?.error?.message ?? "تعذر التحميل");
      setArchives((payload?.archives ?? []).sort((a, b) => b.archive_year - a.archive_year));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل الأرشيفات");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { void load(); }, [load]);

  // Auto-load preview when year changes
  useEffect(() => {
    if (!schoolId) return;
    setPreview(null);
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setPreviewing(true);
      try {
        const r = await fetchWithAuthorizedSession(
          `/api/web/payments/meta?schoolId=${schoolId}&previewYear=${archiveYear}`
        );
        const j = await r.json() as { preview?: PreviewData; archives?: Archive[] };
        if (cancelled) return;
        if (j.preview) {
          setPreview(j.preview);
        } else {
          // Estimate from existing archive or live meta
          const existing = (j.archives ?? []).find((a: Archive) => a.archive_year === Number(archiveYear));
          setPreview({
            students: existing?.total_students ?? 0,
            payments: existing?.total_payments ?? 0,
            totalAmount: existing?.total_amount ?? 0,
          });
        }
      } catch { /* silent */ } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [schoolId, archiveYear]);

  // ── Create archive ─────────────────────────────────────────────────────────
  async function createArchive() {
    if (!schoolId) return;
    setArchiving(true);
    setArchiveMsg("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        archive?: Archive; created?: boolean; error?: { message?: string };
      }>("/api/web/payments/archive", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id: schoolId, archive_year: Number(archiveYear) }),
      });
      if (!response.ok) throw new Error(payload?.error?.message ?? "تعذر حفظ الأرشيف");
      const arc = payload?.archive;
      if (arc) {
        setArchives(prev => {
          const filtered = prev.filter(a => a.id !== arc.id);
          return [arc, ...filtered].sort((a, b) => b.archive_year - a.archive_year);
        });
      }
      setArchiveMsg(`✓ تمت أرشفة سنة ${archiveYear} بنجاح`);
      setArchiveNote("");
      setPreview(null);
      setTimeout(() => setArchiveMsg(""), 4000);
    } catch (e) {
      setArchiveMsg(e instanceof Error ? e.message : "تعذر الأرشفة");
    } finally {
      setArchiving(false);
    }
  }

  // ── Delete archive ─────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget || deleteInput !== "حذف") return;
    setDeleting(true);
    try {
      const r = await fetchWithAuthorizedSession(
        `/api/web/payments/archive?archiveId=${deleteTarget.id}&schoolId=${schoolId}`,
        { method: "DELETE" }
      );
      if (!r.ok) {
        const j = await r.json() as { error?: { message?: string } };
        throw new Error(j?.error?.message ?? "تعذر الحذف");
      }
      setArchives(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteInput("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذر الحذف");
    } finally {
      setDeleting(false);
    }
  }

  // ── Load detail ────────────────────────────────────────────────────────────
  async function openDetail(archive: Archive) {
    if (archive.data) { setDetailArchive(archive); return; }
    setDetailLoading(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<Archive & { error?: { message?: string } }>(
        `/api/web/payments/archive?archiveId=${archive.id}&schoolId=${schoolId}`
      );
      if (!response.ok) throw new Error(payload?.error?.message ?? "تعذر التحميل");
      const enriched = { ...archive, data: payload?.data };
      setArchives(prev => prev.map(a => a.id === archive.id ? enriched : a));
      setDetailArchive(enriched);
    } catch {
      alert("تعذر تحميل تفاصيل الأرشيف");
    } finally {
      setDetailLoading(false);
    }
  }

  // ── Export single ──────────────────────────────────────────────────────────
  async function exportSingle(archive: Archive) {
    setExportingId(archive.id);
    try {
      let arc = archive;
      if (!arc.data) {
        const { payload } = await fetchJsonWithAuthorizedSession<Archive>(
          `/api/web/payments/archive?archiveId=${archive.id}&schoolId=${schoolId}`
        );
        arc = { ...archive, data: payload?.data };
      }
      const { downloadExcelExport } = await import("@/lib/excel-client");
      const students = arc.data?.students ?? [];
      const payments = arc.data?.payments ?? [];
      const sById = Object.fromEntries(students.map(s => [s.id, s]));
      await downloadExcelExport({
        filename: `أرشيف_${arc.archive_year}.xlsx`,
        sheets: [
          {
            name: "الملخص", title: `أرشيف ${arc.archive_year}`,
            columns: [
              { header: "السنة", key: "year", width: 10 },
              { header: "عدد الطلاب", key: "students", width: 14 },
              { header: "عدد الدفعات", key: "payments", width: 14 },
              { header: "إجمالي المبالغ", key: "total", width: 18, numFmt: "#,##0", semanticColor: "paid" as const },
              { header: "تاريخ الأرشفة", key: "date", width: 18 },
            ],
            rows: [{ year: arc.archive_year, students: arc.total_students ?? students.length, payments: arc.total_payments ?? payments.length, total: arc.total_amount ?? 0, date: formatDate(arc.archive_date) }],
          },
          ...(students.length ? [{
            name: "الطلاب", title: `أرشيف ${arc.archive_year}`,
            columns: [
              { header: "اسم الطالب", key: "name", width: 28 },
              { header: "الصف", key: "class", width: 16 },
              { header: "الحالة", key: "status", width: 12 },
              { header: "إجمالي الرسوم", key: "total", width: 16, numFmt: "#,##0" },
              { header: "المدفوع", key: "paid", width: 16, numFmt: "#,##0", semanticColor: "paid" as const },
              { header: "المتبقي", key: "remaining", width: 16, numFmt: "#,##0", semanticColor: "remaining" as const },
            ],
            rows: students.map(s => ({ name: s.full_name, class: s.class_name, status: s.status ?? "", total: s.total_fee, paid: s.paid_fee, remaining: s.remaining_fee })),
          }] : []),
          ...(payments.length ? [{
            name: "الدفعات", title: `أرشيف ${arc.archive_year}`,
            columns: [
              { header: "اسم الطالب", key: "name", width: 28 },
              { header: "الصف", key: "class", width: 14 },
              { header: "المبلغ", key: "amount", width: 14, numFmt: "#,##0", semanticColor: "paid" as const },
              { header: "طريقة الدفع", key: "method", width: 14 },
              { header: "التاريخ", key: "date", width: 14 },
              { header: "رقم الإيصال", key: "receipt", width: 18 },
            ],
            rows: payments.map(p => ({ name: sById[p.student_id]?.full_name ?? "—", class: sById[p.student_id]?.class_name ?? "—", amount: p.amount, method: methodLabel(p.payment_method), date: formatDate(p.created_at), receipt: p.receipt_number ?? p.manual_receipt_number ?? "—" })),
          }] : []),
        ],
      });
    } finally {
      setExportingId(null);
    }
  }

  // ── Export all ─────────────────────────────────────────────────────────────
  async function exportAll() {
    if (archives.length === 0) return;
    setExportingAll(true);
    try {
      const { downloadExcelExport } = await import("@/lib/excel-client");
      await downloadExcelExport({
        filename: `أرشيف_كل_السنوات.xlsx`,
        sheets: [{
          name: "ملخص الأرشيفات", title: "جميع الأرشيفات",
          columns: [
            { header: "السنة", key: "year", width: 10 },
            { header: "عدد الطلاب", key: "students", width: 14 },
            { header: "عدد الدفعات", key: "payments", width: 14 },
            { header: "إجمالي المبالغ", key: "total", width: 18, numFmt: "#,##0", semanticColor: "paid" as const },
            { header: "تاريخ الأرشفة", key: "date", width: 18 },
          ],
          rows: archives.map(a => ({ year: a.archive_year, students: a.total_students ?? 0, payments: a.total_payments ?? 0, total: a.total_amount ?? 0, date: formatDate(a.archive_date) })),
        }],
      });
    } finally {
      setExportingAll(false);
    }
  }

  // ── Browse archive (global mode) ───────────────────────────────────────────
  async function browseArchive(arc: Archive) {
    setBrowsingId(arc.id);
    try {
      let data = arc.data;
      if (!data) {
        const { payload } = await fetchJsonWithAuthorizedSession<Archive>(
          `/api/web/payments/archive?archiveId=${arc.id}&schoolId=${schoolId}`
        );
        data = payload?.data;
        if (data) {
          setArchives(prev => prev.map(a => a.id === arc.id ? { ...a, data } : a));
        }
      }
      setArchiveModeData({
        archiveId: arc.id,
        year: arc.archive_year,
        archiveDate: arc.archive_date,
        totalAmount: arc.total_amount ?? 0,
        students: data?.students ?? [],
        payments: data?.payments ?? [],
      });
      // Expose all archives for year-switcher in banner
      setAvailableArchives(archives.map(a => ({
        id: a.id,
        year: a.archive_year,
        archiveDate: a.archive_date,
        totalStudents: a.total_students ?? 0,
        totalPayments: a.total_payments ?? 0,
        totalAmount: a.total_amount ?? 0,
      })));
      // Navigate to payments to browse data
      router.push(`/${locale}/payments`);
    } finally {
      setBrowsingId(null);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalAmount = archives.reduce((s, a) => s + (a.total_amount ?? 0), 0);
  const latest = archives[0] ?? null;
  const daysSinceLast = latest ? daysSince(latest.archive_date) : null;
  const isAtLimit = archives.length >= MAX;
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(new Set([
    ...archives.map(a => a.archive_year),
    currentYear - 1, currentYear,
  ])).sort((a, b) => b - a);

  // ── Cross-year search results ──────────────────────────────────────────────
  const crossResults = crossSearch.trim().length >= 2
    ? archives.flatMap(a =>
        (a.data?.students ?? [])
          .filter(s => s.full_name.includes(crossSearch))
          .map(s => ({ ...s, year: a.archive_year }))
      )
    : [];

  // ── Compare ────────────────────────────────────────────────────────────────
  function selectCompare(arc: Archive) {
    if (!compareA || compareA.id === arc.id) { setCompareA(arc); setCompareB(null); setShowCompare(false); }
    else { setCompareB(arc); setShowCompare(true); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Header stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Calendar, label: "السنوات المؤرشفة",  value: `${archives.length} / ${MAX}`,           color: isAtLimit ? "var(--danger)" : "var(--primary)" },
          { icon: CreditCard, label: "إجمالي المؤرشف", value: `د.ع ${formatNumber(totalAmount)}`,      color: "var(--success)" },
          { icon: Archive,    label: "آخر أرشفة",       value: latest ? String(latest.archive_year) : "—", color: "var(--info)" },
          { icon: TrendingUp, label: "منذ آخر أرشفة",   value: daysSinceLast !== null ? `${daysSinceLast} يوم` : "—", color: daysSinceLast !== null && daysSinceLast > 180 ? "var(--warning)" : "var(--success)" },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${c.color} 12%, transparent)` }}>
              <c.icon size={18} style={{ color: c.color }} />
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-muted)]">{c.label}</p>
              <p className="text-base font-black text-[var(--text-primary)]">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Alert: archive reminder ── */}
      {daysSinceLast !== null && daysSinceLast > 180 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-semibold">
            مر أكثر من 6 أشهر منذ آخر أرشفة ({daysSinceLast} يوم) — يُنصح بأرشفة السنة الحالية.
          </p>
        </div>
      )}

      {/* ── Create archive panel ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Archive size={16} className="text-[var(--primary)]" />
          <h3 className="text-sm font-black text-[var(--text-primary)]">إنشاء أرشيف جديد</h3>
          {isAtLimit && (
            <span className="text-[11px] font-bold text-[var(--danger)] bg-[var(--danger)]/10 px-2 py-0.5 rounded-lg mr-auto">
              وصلت الحد الأقصى ({MAX}) — احذف أرشيفاً قديماً أولاً
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wide">السنة</label>
            <select
              value={archiveYear}
              onChange={e => { setArchiveYear(e.target.value); setPreview(null); }}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm font-semibold text-[var(--text-primary)] outline-none"
            >
              {yearOptions.map(y => <option key={y} value={y}>سنة {y}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wide">ملاحظة (اختياري)</label>
            <input
              value={archiveNote}
              onChange={e => setArchiveNote(e.target.value)}
              placeholder="مثال: نهاية الفصل الثاني..."
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Preview — auto-loads when year changes */}
        <div className={cn(
          "rounded-xl border p-3 transition-all",
          preview ? "border-[var(--border)] bg-[var(--card-bg)]" : "border-dashed border-[var(--border)] bg-[var(--surface-soft)]"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Eye size={12} className="text-[var(--text-muted)]" />
            <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wide">معاينة سنة {archiveYear}</p>
            {previewing && <Loader2 size={11} className="animate-spin text-[var(--text-muted)] mr-auto" />}
          </div>
          {preview ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-base font-black text-[var(--primary)]">{preview.students}</p>
                <p className="text-[10px] text-[var(--text-muted)]">طالب</p>
              </div>
              <div className="border-x border-[var(--border)]">
                <p className="text-base font-black text-[var(--success)]">{preview.payments}</p>
                <p className="text-[10px] text-[var(--text-muted)]">دفعة</p>
              </div>
              <div>
                <p className="text-sm font-black text-[var(--text-primary)]">د.ع {formatNumber(preview.totalAmount)}</p>
                <p className="text-[10px] text-[var(--text-muted)]">إجمالي</p>
              </div>
            </div>
          ) : !previewing ? (
            <p className="text-xs text-center text-[var(--text-muted)] py-1">تحميل...</p>
          ) : null}
        </div>

        {archiveMsg && (
          <div className={cn("rounded-xl p-3 text-sm font-semibold", archiveMsg.startsWith("✓") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200")}>
            {archiveMsg}
          </div>
        )}

        <div className="flex gap-2 items-center">
          {previewing && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Loader2 size={12} className="animate-spin" /> تحميل المعاينة...
            </span>
          )}
          <button
            onClick={() => setShowArchiveConfirm(true)}
            disabled={archiving || isAtLimit || previewing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-black transition active:scale-95 disabled:opacity-40 mr-auto"
            style={{ background: isAtLimit ? "#94a3b8" : "var(--primary)" }}
          >
            {archiving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
            {archiving ? "جاري الأرشفة..." : `أرشفة سنة ${archiveYear}`}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-semibold">{error}</div>
      )}

      {/* ── Action bar ── */}
      {archives.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowCross(s => !s)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition">
            <History size={13} /> بحث عبر السنوات {showCross ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {archives.length >= 2 && (
            <button onClick={() => { setCompareA(null); setCompareB(null); setShowCompare(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition">
              <GitCompareArrows size={13} /> مقارنة سنتين
            </button>
          )}
          <button onClick={exportAll} disabled={exportingAll} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition disabled:opacity-40 mr-auto">
            {exportingAll ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            تصدير الكل
          </button>
          <button onClick={load} className="h-8 w-8 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition">
            <RefreshCw size={13} />
          </button>
        </div>
      )}

      {/* ── Cross-year search ── */}
      {showCross && archives.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={crossSearch}
              onChange={e => setCrossSearch(e.target.value)}
              placeholder="ابحث عن طالب عبر جميع السنوات..."
              className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            />
          </div>
          {crossSearch.trim().length >= 2 && (
            crossResults.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-3">لا نتائج</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {crossResults.map((s, i) => (
                  <div key={`${s.id}-${i}`} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)]">
                    <span className="text-[11px] font-black text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-lg flex-shrink-0">{s.year}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{s.full_name}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{s.class_name}</p>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <p className="text-xs font-extrabold text-[var(--success)]">د.ع {formatNumber(s.paid_fee)}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">مدفوع</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ── Archive cards ── */}
      {archives.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-dashed border-[var(--border)]">
          <Archive size={40} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">لا توجد أرشيفات بعد</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {archives.map(arc => {
            const isCompareSelected = compareA?.id === arc.id || compareB?.id === arc.id;
            const age = daysSince(arc.archive_date);
            return (
              <div
                key={arc.id}
                className={cn(
                  "rounded-2xl border bg-[var(--card-bg)] p-4 space-y-3 transition",
                  isCompareSelected && showCompare ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20" : "border-[var(--border)]"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-black text-[var(--primary)]">{arc.archive_year}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{formatDate(arc.archive_date)} · منذ {age} يوم</p>
                  </div>
                  <p className="text-base font-extrabold text-[var(--success)]">
                    د.ع {formatNumber(arc.total_amount ?? 0)}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[var(--surface-soft)] p-2 text-center">
                    <p className="text-sm font-black text-[var(--text-primary)]">{arc.total_students ?? 0}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">طالب</p>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-soft)] p-2 text-center">
                    <p className="text-sm font-black text-[var(--text-primary)]">{arc.total_payments ?? 0}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">دفعة</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--border)]">
                  <button
                    onClick={() => void browseArchive(arc)}
                    disabled={browsingId === arc.id}
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border text-xs font-bold transition"
                    style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
                  >
                    {browsingId === arc.id ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                    تصفح بيانات سنة {arc.archive_year}
                  </button>
                  <button
                    onClick={() => openDetail(arc)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition"
                  >
                    {detailLoading && detailArchive?.id === arc.id ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                    عرض التفاصيل
                  </button>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => exportSingle(arc)}
                      disabled={exportingId === arc.id}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-[var(--border)] text-[11px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition disabled:opacity-40"
                    >
                      {exportingId === arc.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                      تصدير
                    </button>
                    {archives.length >= 2 && (
                      <button
                        onClick={() => selectCompare(arc)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-[11px] font-bold transition",
                          isCompareSelected ? "border-[var(--primary)] bg-[var(--primary)]/8 text-[var(--primary)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
                        )}
                      >
                        <GitCompareArrows size={11} />
                        {isCompareSelected ? "محدد" : "مقارنة"}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => { setDeleteTarget(arc); setDeleteInput(""); setTimeout(() => deleteInputRef.current?.focus(), 50); }}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl border border-[var(--danger)]/30 text-[11px] font-bold text-[var(--danger)] hover:bg-[var(--danger)]/8 transition"
                  >
                    <Trash2 size={11} /> حذف الأرشيف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Compare panel ── */}
      {showCompare && compareA && compareB && (
        <div className="rounded-2xl border border-[var(--primary)] bg-[var(--card-bg)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompareArrows size={16} className="text-[var(--primary)]" />
              <h3 className="text-sm font-black text-[var(--text-primary)]">مقارنة بين سنتين</h3>
            </div>
            <button onClick={() => { setShowCompare(false); setCompareA(null); setCompareB(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[compareA, compareB].map(arc => (
              <div key={arc.id} className="space-y-2">
                <p className="text-base font-black text-[var(--primary)] text-center">{arc.archive_year}</p>
                {[
                  { label: "الطلاب", value: arc.total_students ?? 0, fmt: false },
                  { label: "الدفعات", value: arc.total_payments ?? 0, fmt: false },
                  { label: "إجمالي المبالغ", value: arc.total_amount ?? 0, fmt: true },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center px-3 py-2 rounded-xl bg-[var(--surface-soft)]">
                    <span className="text-xs text-[var(--text-muted)]">{row.label}</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)]">
                      {row.fmt ? `د.ع ${formatNumber(row.value)}` : formatNumber(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Delta row */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]">
            {[
              { label: "فرق الطلاب", delta: (compareB.total_students ?? 0) - (compareA.total_students ?? 0) },
              { label: "فرق الدفعات", delta: (compareB.total_payments ?? 0) - (compareA.total_payments ?? 0) },
              { label: "فرق المبالغ", delta: (compareB.total_amount ?? 0) - (compareA.total_amount ?? 0), fmt: true },
            ].map(row => (
              <div key={row.label} className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
                <p className={cn("text-sm font-black", row.delta > 0 ? "text-[var(--success)]" : row.delta < 0 ? "text-[var(--danger)]" : "text-[var(--text-muted)]")}>
                  {row.delta > 0 ? "+" : ""}{row.fmt ? `د.ع ${formatNumber(row.delta)}` : formatNumber(row.delta)}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{row.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detail modal ── */}
      {detailArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDetailArchive(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-black text-[var(--text-primary)]">أرشيف سنة {detailArchive.archive_year}</h3>
                <p className="text-xs text-[var(--text-muted)]">{detailArchive.total_students ?? 0} طالب · {detailArchive.total_payments ?? 0} دفعة · د.ع {formatNumber(detailArchive.total_amount ?? 0)}</p>
              </div>
              <button onClick={() => setDetailArchive(null)} className="h-8 w-8 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition">
                <X size={14} />
              </button>
            </div>
            {/* Tabs + search */}
            <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
              {(["students", "payments"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold transition", detailTab === tab ? "text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]")}
                  style={detailTab === tab ? { background: "var(--primary)" } : {}}
                >
                  {tab === "students" ? <><Users size={11} className="inline-block ms-1" /> الطلاب</> : <><CreditCard size={11} className="inline-block ms-1" /> الدفعات</>}
                </button>
              ))}
              <div className="relative mr-auto">
                <Search size={12} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={detailSearch}
                  onChange={e => setDetailSearch(e.target.value)}
                  placeholder="بحث..."
                  className="ps-7 pe-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-xs text-[var(--text-primary)] outline-none w-40"
                />
              </div>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {detailArchive.data ? (
                detailTab === "students" ? (
                  (detailArchive.data.students ?? [])
                    .filter(s => !detailSearch || s.full_name.includes(detailSearch) || s.class_name.includes(detailSearch))
                    .map(s => (
                      <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--surface-soft)] transition">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{s.full_name}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{s.class_name}</p>
                        </div>
                        <div className="text-end flex-shrink-0 space-y-0.5">
                          <p className="text-xs font-extrabold text-[var(--success)]">مدفوع: د.ع {formatNumber(s.paid_fee)}</p>
                          <p className="text-[11px] text-[var(--danger)]">متبقي: د.ع {formatNumber(s.remaining_fee)}</p>
                        </div>
                      </div>
                    ))
                ) : (
                  (() => {
                    const sById = Object.fromEntries((detailArchive.data?.students ?? []).map(s => [s.id, s]));
                    return (detailArchive.data?.payments ?? [])
                      .filter(p => !detailSearch || (sById[p.student_id]?.full_name ?? "").includes(detailSearch))
                      .map(p => (
                        <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--surface-soft)] transition">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{sById[p.student_id]?.full_name ?? "—"}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">{formatDate(p.created_at)} · {methodLabel(p.payment_method)}</p>
                          </div>
                          <p className="text-sm font-extrabold text-[var(--success)] flex-shrink-0">د.ع {formatNumber(p.amount)}</p>
                        </div>
                      ));
                  })()
                )
              ) : (
                <div className="flex items-center justify-center h-24">
                  <p className="text-sm text-[var(--text-muted)]">لا توجد بيانات — لم يتم تحميل التفاصيل بعد</p>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="p-3 border-t border-[var(--border)] flex justify-end">
              <button onClick={() => exportSingle(detailArchive)} disabled={exportingId === detailArchive.id} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-black transition hover:opacity-90 disabled:opacity-50">
                {exportingId === detailArchive.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                تصدير إكسل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Archive confirm modal ── */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowArchiveConfirm(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-5 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] flex items-center justify-center flex-shrink-0">
                <Archive size={18} className="text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)]">تأكيد أرشفة سنة {archiveYear}</h3>
                <p className="text-xs text-[var(--text-muted)]">سيتم حفظ لقطة من البيانات الحالية</p>
              </div>
              <button onClick={() => setShowArchiveConfirm(false)} className="mr-auto text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={16} />
              </button>
            </div>

            {/* Preview summary */}
            {preview ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wide mb-3">المعاينة — سنة {archiveYear}</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl font-black text-[var(--primary)]">{preview.students}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">طالب</p>
                  </div>
                  <div className="border-x border-[var(--border)]">
                    <p className="text-xl font-black text-[var(--success)]">{preview.payments}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">دفعة</p>
                  </div>
                  <div>
                    <p className="text-base font-black text-[var(--text-primary)]">د.ع {formatNumber(preview.totalAmount)}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">إجمالي</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 flex items-center justify-center gap-2 text-[var(--text-muted)]">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs font-semibold">تحميل المعاينة...</span>
              </div>
            )}

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800 font-semibold">
                هذه عملية آمنة — لن تتغير أي بيانات حية. فقط لقطة للأرشيف.
              </p>
            </div>

            {archiveNote && (
              <p className="text-xs text-[var(--text-secondary)] font-semibold">ملاحظة: {archiveNote}</p>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowArchiveConfirm(false)} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition">إلغاء</button>
              <button
                onClick={async () => { setShowArchiveConfirm(false); await createArchive(); }}
                disabled={archiving}
                className="flex-1 py-2 rounded-xl text-white text-sm font-black transition active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={{ background: "var(--primary)" }}
              >
                {archiving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                {archiving ? "جاري الأرشفة..." : "تأكيد الأرشفة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[var(--card-bg)] rounded-2xl border border-[var(--danger)]/30 p-5 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)]">حذف أرشيف {deleteTarget.archive_year}</h3>
                <p className="text-xs text-[var(--text-muted)]">هذا الإجراء لا يمكن التراجع عنه</p>
              </div>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-700 font-semibold">
                سيتم حذف جميع بيانات سنة {deleteTarget.archive_year} نهائياً — {deleteTarget.total_students ?? 0} طالب و {deleteTarget.total_payments ?? 0} دفعة.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-[var(--text-secondary)] font-semibold">اكتب <strong className="text-[var(--danger)]">حذف</strong> للتأكيد</p>
              <input
                ref={deleteInputRef}
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="حذف"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition">إلغاء</button>
              <button
                onClick={confirmDelete}
                disabled={deleteInput !== "حذف" || deleting}
                className="flex-1 py-2 rounded-xl text-white text-sm font-black transition active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={{ background: "#dc2626" }}
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "جاري الحذف..." : "حذف نهائياً"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
