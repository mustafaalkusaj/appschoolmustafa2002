"use client";

import { useMemo } from "react";
import { TrendingUp, Users, School, CreditCard, Activity, DollarSign } from "@/lib/icons";

// Estimated monthly prices in USD (illustrative)
const PLAN_PRICE_USD: Record<string, number> = {
  basic: 50,
  premium: 150,
  enterprise: 400,
};
import type { SchoolRecord, UserRecord, SubscriptionRecord } from "../_components";

interface AnalyticsDashboardProps {
  schools: SchoolRecord[];
  users: UserRecord[];
  subscriptions: SubscriptionRecord[];
}

interface MetricCard {
  label: string;
  value: string | number;
  change: number;
  icon: typeof TrendingUp;
  color: string;
}

export function AnalyticsTab({
  schools,
  users,
  subscriptions,
}: AnalyticsDashboardProps) {
  const analytics = useMemo(() => {
    const activeSchools = schools.filter((s) => s.is_active).length;
    const totalSchools = schools.length;
    const activeUsers = users.filter((u) => u.is_active).length;
    const totalUsers = users.length;
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "active"
    ).length;
    const totalSubscriptions = subscriptions.length;

    // Calculate growth (simplified - would need historical data)
    const schoolGrowth = ((activeSchools / (totalSchools || 1)) * 100).toFixed(1);
    const userGrowth = ((activeUsers / (totalUsers || 1)) * 100).toFixed(1);
    const subGrowth = ((activeSubscriptions / (totalSubscriptions || 1)) * 100).toFixed(1);

    // Plan distribution
    const planDist = schools.reduce(
      (acc, s) => {
        acc[s.plan] = (acc[s.plan] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Role distribution
    const roleDist = users.reduce(
      (acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Revenue estimate: based on active subscriptions plan
    const activeSubsBySchool = new Map<string, string>();
    for (const sub of subscriptions) {
      if (sub.status === "active") {
        activeSubsBySchool.set(sub.school_id, sub.plan);
      }
    }
    const monthlyRevenue = Array.from(activeSubsBySchool.values()).reduce(
      (sum, plan) => sum + (PLAN_PRICE_USD[plan] ?? 0),
      0,
    );
    const yearlyRevenue = monthlyRevenue * 12;

    // Subscriptions expiring in 30 days
    const now = Date.now();
    const expiringSoon = subscriptions.filter((s) => {
      if (!s.end_date) return false;
      const diff = new Date(s.end_date).getTime() - now;
      return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      activeSchools,
      totalSchools,
      activeUsers,
      totalUsers,
      activeSubscriptions,
      totalSubscriptions,
      schoolGrowth,
      userGrowth,
      subGrowth,
      planDist,
      roleDist,
      monthlyRevenue,
      yearlyRevenue,
      expiringSoon,
    };
  }, [schools, users, subscriptions]);

  const metrics: MetricCard[] = useMemo(
    () => [
      {
        label: "المدارس النشطة",
        value: `${analytics.activeSchools}/${analytics.totalSchools}`,
        change: parseFloat(analytics.schoolGrowth),
        icon: School,
        color: "bg-blue-100 text-blue-600",
      },
      {
        label: "المستخدمون النشطون",
        value: `${analytics.activeUsers}/${analytics.totalUsers}`,
        change: parseFloat(analytics.userGrowth),
        icon: Users,
        color: "bg-green-100 text-green-600",
      },
      {
        label: "الاشتراكات النشطة",
        value: `${analytics.activeSubscriptions}/${analytics.totalSubscriptions}`,
        change: parseFloat(analytics.subGrowth),
        icon: CreditCard,
        color: "bg-purple-100 text-purple-600",
      },
      {
        label: "معدل الفعالية",
        value: `${(
          ((analytics.activeSchools + analytics.activeUsers) /
            (analytics.totalSchools + analytics.totalUsers || 1)) *
          100
        ).toFixed(1)}%`,
        change: parseFloat(analytics.schoolGrowth),
        icon: Activity,
        color: "bg-orange-100 text-orange-600",
      },
    ],
    [analytics]
  );

  return (
    <div className="space-y-6 p-6">
      {/* Key Metrics */}
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          مؤشرات الأداء الرئيسية
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-tertiary)]">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                      {metric.value}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      <TrendingUp size={14} className="text-green-600" />
                      <span className="text-xs font-bold text-green-600">
                        {metric.change.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className={`rounded-full p-3 ${metric.color}`}>
                    <Icon size={20} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
            توزيع الخطط
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.planDist).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--text-secondary)] capitalize">
                  {plan === "basic"
                    ? "أساسي"
                    : plan === "premium"
                      ? "متقدم"
                      : "مؤسسي"}
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-24 rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${(count / (analytics.totalSchools || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role Distribution */}
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
            توزيع الأدوار
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.roleDist).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--text-secondary)] capitalize">
                  {role === "super_admin"
                    ? "مسؤول عام"
                    : role === "admin"
                      ? "مسؤول"
                      : role === "manager"
                        ? "مدير"
                        : "مستخدم"}
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-24 rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{
                        width: `${(count / (analytics.totalUsers || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Estimate */}
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] bg-green-100 text-green-600">
            <DollarSign size={18} />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">الإيرادات المتوقعة</h3>
          <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-muted)] px-2 py-1 rounded-full">تقديرية</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 p-4">
            <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-1">الإيراد الشهري</p>
            <p className="text-2xl font-black text-green-800 dark:text-green-300">${analytics.monthlyRevenue.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">الإيراد السنوي</p>
            <p className="text-2xl font-black text-blue-800 dark:text-blue-300">${analytics.yearlyRevenue.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">ينتهي خلال 30 يوم</p>
            <p className="text-2xl font-black text-amber-800 dark:text-amber-300">{analytics.expiringSoon} مدرسة</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {Object.entries(analytics.planDist).map(([plan, count]) => {
            const price = PLAN_PRICE_USD[plan] ?? 0;
            return (
              <div key={plan} className="flex items-center justify-between text-sm">
                <span className="font-bold text-[var(--text-secondary)]">
                  {plan === "basic" ? "أساسية" : plan === "premium" ? "مميزة" : "مؤسسية"} × {count}
                </span>
                <span className="font-black text-[var(--text-primary)]">${(price * count).toLocaleString()}/شهر</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          ملخص الإحصائيات
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs font-bold text-[var(--text-tertiary)]">
              إجمالي المدارس
            </p>
            <p className="mt-2 text-xl font-black text-[var(--text-primary)]">
              {analytics.totalSchools}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-[var(--text-tertiary)]">
              إجمالي المستخدمين
            </p>
            <p className="mt-2 text-xl font-black text-[var(--text-primary)]">
              {analytics.totalUsers}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-[var(--text-tertiary)]">
              إجمالي الاشتراكات
            </p>
            <p className="mt-2 text-xl font-black text-[var(--text-primary)]">
              {analytics.totalSubscriptions}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-[var(--text-tertiary)]">
              معدل الفعالية
            </p>
            <p className="mt-2 text-xl font-black text-[var(--text-primary)]">
              {(
                ((analytics.activeSchools + analytics.activeUsers) /
                  (analytics.totalSchools + analytics.totalUsers || 1)) *
                100
              ).toFixed(0)}
              %
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
