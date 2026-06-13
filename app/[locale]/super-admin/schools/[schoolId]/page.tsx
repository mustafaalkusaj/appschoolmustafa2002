"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Users,
  GraduationCap,
  GitBranch,
  BadgeCheck,
  Ban,
  History,
  RefreshCw,
  Loader2,
  CreditCard,
} from "@/lib/icons";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { useSuperAdminData } from "../../_hooks/useSuperAdminData";
import { PLAN_LABELS, SUBSCRIPTION_STATUS_LABELS } from "../../_components/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolStats {
  students: number;
  users: number;
  branches: number;
}

interface SubRecord {
  id: string;
  plan: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
}

interface StatsPayload {
  ok: boolean;
  school: {
    id: string;
    name: string;
    city: string | null;
    phone: string | null;
    owner_email: string | null;
    plan: string;
    is_active: boolean;
    created_at: string | null;
  };
  stats: SchoolStats;
  subscription: SubRecord | null;
  error?: { message?: string };
}

interface HistoryPayload {
  ok: boolean;
  subscriptions?: SubRecord[];
  error?: { message?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-IQ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysLeft(endDate: string | null) {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20"
      : status === "suspended" || status === "expired"
        ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20"
        : "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--border)]";
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-black ${cls}`}>
      {SUBSCRIPTION_STATUS_LABELS[status as keyof typeof SUBSCRIPTION_STATUS_LABELS] ?? status}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${color}`}>
        <Icon size={16} />
      </span>
      <div>
        <p className="text-xl font-black text-[var(--text-primary)] leading-none">{value}</p>
        <p className="text-[11px] font-bold text-[var(--text-muted)] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchoolDetailPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const { schools } = useSuperAdminData();

  // Preloaded school name for breadcrumb (fast)
  const preloaded = schools.find((s) => s.id === schoolId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatsPayload | null>(null);

  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<SubRecord[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);

    void fetchJsonWithAuthorizedSession<StatsPayload>(
      `/api/web/super-admin/schools/${schoolId}/stats`,
    ).then(({ response, payload }) => {
      if (!response.ok || !payload?.ok) {
        setError(payload?.error?.message ?? "تعذر تحميل بيانات المدرسة.");
      } else {
        setData(payload);
      }
      setLoading(false);
    }).catch(() => {
      setError("تعذر الاتصال بالخادم.");
      setLoading(false);
    });

    void fetchJsonWithAuthorizedSession<HistoryPayload>(
      `/api/web/super-admin/subscriptions/${schoolId}/history`,
    ).then(({ payload }) => {
      setHistory(payload?.subscriptions ?? []);
      setHistoryLoading(false);
    }).catch(() => {
      setHistoryLoading(false);
    });
  }, [schoolId]);

  const school = data?.school;
  const stats = data?.stats;
  const sub = data?.subscription;
  const days = daysLeft(sub?.end_date ?? null);

  const schoolName = school?.name ?? preloaded?.name ?? "...";

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--text-muted)]">
        <Link href="/super-admin/schools" className="hover:text-[var(--text-primary)] transition-colors">
          المدارس
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text-primary)]">{schoolName}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--primary)] opacity-40" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-6 text-sm font-bold text-[var(--danger)]">
          {error}
        </div>
      ) : school ? (
        <>
          {/* Header card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-[var(--text-primary)]">{school.name}</h1>
                  {school.is_active ? (
                    <BadgeCheck size={16} className="text-[var(--success)]" />
                  ) : (
                    <Ban size={16} className="text-[var(--danger)]" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--text-secondary)]">
                  {school.city && <span>{school.city}</span>}
                  {school.phone && <span>{school.phone}</span>}
                  {school.owner_email && <span>{school.owner_email}</span>}
                  <span className="text-[var(--text-muted)]">أُنشئت {fmt(school.created_at)}</span>
                </div>
              </div>
              <span className="inline-flex items-center rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/8 px-3 py-1 text-[12px] font-black text-[var(--primary)]">
                {PLAN_LABELS[school.plan as keyof typeof PLAN_LABELS] ?? school.plan}
              </span>
            </div>
          </div>

          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={GraduationCap}
                label="طالب"
                value={stats.students}
                color="bg-sky-500/10 text-sky-600 border-sky-500/20"
              />
              <StatCard
                icon={Users}
                label="مستخدم"
                value={stats.users}
                color="bg-violet-500/10 text-violet-600 border-violet-500/20"
              />
              <StatCard
                icon={GitBranch}
                label="فرع"
                value={stats.branches}
                color="bg-teal-500/10 text-teal-600 border-teal-500/20"
              />
            </div>
          )}

          {/* Current subscription */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={15} className="text-[var(--primary)]" />
              <h2 className="text-sm font-black text-[var(--text-primary)]">الاشتراك الحالي</h2>
            </div>
            {sub ? (
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">الباقة</p>
                  <p className="font-black text-[var(--text-primary)]">
                    {PLAN_LABELS[sub.plan as keyof typeof PLAN_LABELS] ?? sub.plan}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">الحالة</p>
                  <StatusPill status={sub.status} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">الانتهاء</p>
                  <p className="font-black text-[var(--text-primary)]">{fmt(sub.end_date)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">الأيام المتبقية</p>
                  <p className={`font-black ${days !== null && days < 0 ? "text-[var(--danger)]" : days !== null && days <= 30 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                    {days === null ? "—" : days < 0 ? `منتهي (${Math.abs(days)} يوم)` : `${days} يوم`}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-[var(--text-muted)]">لا يوجد اشتراك مسجل.</p>
            )}
          </div>

          {/* Subscription history */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <History size={15} className="text-[var(--text-secondary)]" />
              <h2 className="text-sm font-black text-[var(--text-primary)]">سجل الاشتراكات</h2>
            </div>
            {historyLoading ? (
              <div className="flex items-center gap-2 py-4">
                <RefreshCw size={14} className="animate-spin text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">جارٍ التحميل...</span>
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm font-bold text-[var(--text-muted)]">لا يوجد سجل.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>الباقة</th>
                      <th>الحالة</th>
                      <th>البداية</th>
                      <th>الانتهاء</th>
                      <th>تاريخ الإنشاء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry.id}>
                        <td className="font-bold">
                          {PLAN_LABELS[entry.plan as keyof typeof PLAN_LABELS] ?? entry.plan}
                        </td>
                        <td>
                          <StatusPill status={entry.status} />
                        </td>
                        <td className="text-[var(--text-secondary)]">{fmt(entry.start_date)}</td>
                        <td className="text-[var(--text-secondary)]">{fmt(entry.end_date)}</td>
                        <td className="text-[var(--text-secondary)]">{fmt(entry.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
