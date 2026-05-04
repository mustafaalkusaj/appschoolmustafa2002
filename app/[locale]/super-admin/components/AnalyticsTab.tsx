"use client";

import { useMemo } from "react";
import { TrendingUp, Users, School, CreditCard, Activity } from "@/lib/icons";
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
