"use client";

import { School, Users, CreditCard, AlertTriangle } from "@/lib/icons";
import { cn } from "@/lib/brand/brand-utils";
import type {
  SchoolRecord,
  UserRecord,
  SubscriptionRecord,
  ActiveTab,
  SpotlightFilter,
  OverviewDiagnostics,
  SchoolPlan,
} from "./types";
import { PLAN_LABELS } from "./types";

interface OverviewTabProps {
  schools: SchoolRecord[];
  users: UserRecord[];
  subscriptions: SubscriptionRecord[];
  loading: boolean;
  overviewDiagnostics: OverviewDiagnostics | null;
  spotlightFilter: SpotlightFilter | null;
  onClearSpotlightFilter: () => void;
  onFocusSpotlight: (filter: SpotlightFilter, tab: ActiveTab) => void;
  onOpenCreateSchool: () => void;
  onOpenCreateUser: () => void;
  onSetActiveTab: (tab: ActiveTab) => void;
  ROLE_LABELS: Record<string, string>;
  PLAN_LABELS: Record<SchoolPlan, string>;
}

export function OverviewTab({
  schools,
  users,
  subscriptions,
  onFocusSpotlight,
  onOpenCreateSchool,
  onOpenCreateUser,
  onSetActiveTab,
}: OverviewTabProps) {
  const activeSchools = schools.filter((s) => s.is_active && !s.deleted_at).length;
  const inactiveSchools = schools.filter((s) => !s.is_active && !s.deleted_at).length;
  const missingBranding = schools.filter((s) => !s.deleted_at && !s.primary_color).length;

  const now = Date.now();
  const expiringCount = subscriptions.filter((s) => {
    if (!s.end_date) return false;
    const d = new Date(s.end_date).getTime() - now;
    return d >= 0 && d <= 30 * 86400000;
  }).length;

  const orphanUsers = users.filter((u) => !u.school_id).length;

  const planCounts = schools.reduce<Record<SchoolPlan, number>>(
    (acc, s) => {
      if (!s.deleted_at) acc[s.plan] = (acc[s.plan] ?? 0) + 1;
      return acc;
    },
    { basic: 0, premium: 0, enterprise: 0 },
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <button
          className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)] text-start hover:border-[var(--primary)]/30 transition-all"
          onClick={() => onSetActiveTab("schools")}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-100 flex items-center justify-center">
              <School size={18} className="text-blue-600" />
            </div>
            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">المدارس</span>
          </div>
          <div className="text-3xl font-black text-[var(--text-primary)]">{schools.filter((s) => !s.deleted_at).length}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{activeSchools} نشطة · {inactiveSchools} غير نشطة</div>
        </button>

        <button
          className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)] text-start hover:border-[var(--primary)]/30 transition-all"
          onClick={() => onSetActiveTab("users")}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-purple-100 flex items-center justify-center">
              <Users size={18} className="text-purple-600" />
            </div>
            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">المستخدمون</span>
          </div>
          <div className="text-3xl font-black text-[var(--text-primary)]">{users.length}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{users.filter((u) => u.is_active).length} نشط</div>
        </button>

        <button
          className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)] text-start hover:border-[var(--primary)]/30 transition-all"
          onClick={() => onSetActiveTab("subscriptions")}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <CreditCard size={18} className="text-emerald-600" />
            </div>
            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">الاشتراكات</span>
          </div>
          <div className="text-3xl font-black text-[var(--text-primary)]">{subscriptions.length}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{subscriptions.filter((s) => s.status === "active").length} نشط</div>
        </button>

        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">تنبيهات</span>
          </div>
          <div className="text-3xl font-black text-[var(--text-primary)]">{expiringCount + inactiveSchools}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{expiringCount} اشتراك ينتهي قريباً</div>
        </div>
      </div>

      {/* Spotlight Actions */}
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <h3 className="text-sm font-black text-[var(--text-primary)] mb-4">إجراءات سريعة</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {inactiveSchools > 0 && (
            <button
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black text-amber-700 hover:bg-amber-100 transition-all text-start"
              onClick={() => onFocusSpotlight("inactive_schools", "schools")}
            >
              <div className="text-lg font-black">{inactiveSchools}</div>
              مدرسة غير نشطة
            </button>
          )}
          {expiringCount > 0 && (
            <button
              className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs font-black text-orange-700 hover:bg-orange-100 transition-all text-start"
              onClick={() => onFocusSpotlight("expiring_subscriptions", "subscriptions")}
            >
              <div className="text-lg font-black">{expiringCount}</div>
              اشتراك ينتهي قريباً
            </button>
          )}
          {orphanUsers > 0 && (
            <button
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700 hover:bg-red-100 transition-all text-start"
              onClick={() => onFocusSpotlight("orphan_users", "users")}
            >
              <div className="text-lg font-black">{orphanUsers}</div>
              مستخدم بلا مدرسة
            </button>
          )}
          {missingBranding > 0 && (
            <button
              className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-xs font-black text-purple-700 hover:bg-purple-100 transition-all text-start"
              onClick={() => onFocusSpotlight("missing_branding", "schools")}
            >
              <div className="text-lg font-black">{missingBranding}</div>
              مدرسة بدون هوية
            </button>
          )}
          <button
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs font-black text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-all text-start"
            onClick={onOpenCreateSchool}
          >
            <div className="text-lg">+</div>
            إضافة مدرسة
          </button>
          <button
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs font-black text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-all text-start"
            onClick={onOpenCreateUser}
          >
            <div className="text-lg">+</div>
            إضافة مستخدم
          </button>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <h3 className="text-sm font-black text-[var(--text-primary)] mb-4">توزيع الخطط</h3>
        <div className="grid grid-cols-3 gap-4">
          {(Object.keys(planCounts) as SchoolPlan[]).map((plan) => (
            <div key={plan} className="text-center">
              <div className="text-2xl font-black text-[var(--text-primary)]">{planCounts[plan]}</div>
              <div className={cn("text-xs font-bold mt-1", plan === "enterprise" ? "text-purple-600" : plan === "premium" ? "text-blue-600" : "text-[var(--text-muted)]")}>
                {PLAN_LABELS[plan]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
