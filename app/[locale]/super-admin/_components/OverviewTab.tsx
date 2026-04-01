"use client";

import dynamic from "next/dynamic";
import {
  Building2,
  CreditCard,
  AlertTriangle,
  Users,
  School,
  ChevronLeft,
  X,
  Sparkles,
  Plus,
  UserRoundPlus,
  RefreshCw,
} from "@/lib/icons";
import { SectionCard, StatCard, EmptyState } from "./ui";
import {
  formatDate,
  statusTone,
  calculateDaysLeft,
  isSubscriptionExpired,
  relationName,
} from "./utils";
import type {
  SchoolRecord,
  UserRecord,
  SubscriptionRecord,
  OverviewDiagnostics,
  SpotlightFilter,
  ActiveTab,
} from "./types";
import { SCHOOL_BRAND } from "@/lib/brand";

const chartSkeleton = () => <div className="sk h-full w-full rounded-[24px]" />;

const PlanDistributionChart = dynamic(
  () => import("../components/OverviewCharts").then((module) => module.PlanDistributionChart),
  { ssr: false, loading: chartSkeleton }
);

const RoleDistributionChart = dynamic(
  () => import("../components/OverviewCharts").then((module) => module.RoleDistributionChart),
  { ssr: false, loading: chartSkeleton }
);

const SubscriptionHealthPieChart = dynamic(
  () => import("../components/OverviewCharts").then((module) => module.SubscriptionHealthPieChart),
  { ssr: false, loading: chartSkeleton }
);

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
  PLAN_LABELS: Record<string, string>;
}

export function OverviewTab({
  schools,
  users,
  subscriptions,
  loading,
  overviewDiagnostics: _overviewDiagnostics,
  spotlightFilter,
  onClearSpotlightFilter,
  onFocusSpotlight,
  onOpenCreateSchool,
  onOpenCreateUser,
  onSetActiveTab,
  ROLE_LABELS,
  PLAN_LABELS,
}: OverviewTabProps) {
  const activeSchools = schools.filter((school) => school.is_active);
  const inactiveSchools = schools.filter((school) => !school.is_active);
  const activeSubscriptions = subscriptions.filter((subscription) => !isSubscriptionExpired(subscription));
  const expiredSubscriptions = subscriptions.filter((subscription) => isSubscriptionExpired(subscription));
  const expiringSoon = subscriptions.filter((subscription) => {
    const days = calculateDaysLeft(subscription.end_date);
    return !isSubscriptionExpired(subscription) && days !== null && days <= 30;
  });
  const usersWithoutSchool = users.filter((user) => user.role !== "super_admin" && !user.school_id);
  const schoolsMissingBranding = schools.filter((school) => !school.primary_color || !school.secondary_color);

  const recentSchools = schools.slice(0, 4);
  const recentUsers = users.slice(0, 5);

  const planData = [
    { name: "أساسية", value: schools.filter((school) => school.plan === "basic").length, fill: "#4F8CFF" },
    { name: "مميزة", value: schools.filter((school) => school.plan === "premium").length, fill: "#79D7FF" },
    { name: "مؤسسية", value: schools.filter((school) => school.plan === "enterprise").length, fill: "#8B5CF6" },
  ];

  const roleData = [
    { name: "المدير العام", value: users.filter((user) => user.role === "super_admin").length },
    { name: "مدير مدرسة", value: users.filter((user) => user.role === "admin").length },
    { name: "موظف", value: users.filter((user) => user.role === "employee").length },
  ];

  const subscriptionHealthData = [
    { name: "نشط", value: activeSubscriptions.length, fill: "#35C58A" },
    { name: "موقوف / منتهي", value: expiredSubscriptions.length, fill: "#FF7272" },
    { name: "قرب الانتهاء", value: expiringSoon.length, fill: "#FFB84D" },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="ui-surface rounded-[32px] p-6">
          <div className="sk mb-4 h-8 w-48 rounded-full" />
          <div className="sk h-[280px] w-full rounded-[28px]" />
        </div>
        <div className="ui-surface rounded-[32px] p-6">
          <div className="sk mb-4 h-8 w-36 rounded-full" />
          <div className="space-y-3">
            <div className="sk h-20 w-full rounded-[24px]" />
            <div className="sk h-20 w-full rounded-[24px]" />
            <div className="sk h-20 w-full rounded-[24px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="ui-soft-surface relative overflow-hidden rounded-[34px] p-6 sm:p-7">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(121,215,255,0.16),transparent_72%)] lg:block" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-[760px] space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-extrabold text-[var(--text-secondary)]">
              <Sparkles size={14} className="text-[var(--primary)]" />
              تجربة مشرف عربية أولاً بطبقات هادئة وقرارات أسرع
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-[3rem]">
                مرحباً بك في مركز التحكم الخاص بـ {SCHOOL_BRAND.nameAr}
              </h2>
              <p className="max-w-[58rem] text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
                لوحة موحدة لمتابعة حالة المدارس والمستخدمين والاشتراكات، مع تسلسل بصري أوضح وقرارات
                تشغيلية أسرع دون المساس بمنطق البيانات الحالي.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="ui-button ui-button--primary inline-flex items-center gap-2" onClick={onOpenCreateSchool}>
              <Plus size={16} />
              إضافة مدرسة
            </button>
            <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2" onClick={onOpenCreateUser}>
              <UserRoundPlus size={16} />
              إضافة مستخدم
            </button>
            <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2" onClick={() => onSetActiveTab("subscriptions")}>
              <RefreshCw size={16} />
              متابعة الاشتراكات
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <StatCard icon={Building2} label="إجمالي المدارس" value={schools.length} meta={`${activeSchools.length} مدرسة نشطة حالياً`} tint="var(--primary)" />
        <StatCard icon={CreditCard} label="الاشتراكات النشطة" value={activeSubscriptions.length} meta={`${expiredSubscriptions.length} متعثر و ${expiringSoon.length} قريب الانتهاء`} tint="var(--success)" />
        <StatCard icon={AlertTriangle} label="قرب انتهاء الاشتراكات" value={expiringSoon.length} meta="المدارس التي تحتاج إجراء استباقي" tint="var(--warning)" />
        <StatCard icon={Users} label="المستخدمون" value={users.length} meta={`${users.filter((user) => user.is_active).length} مستخدم مفعّل`} tint="#8B5CF6" />
      </div>

      <SectionCard
        title="مركز الإجراءات السريعة"
        description="أولويات جاهزة حسب البيانات الحالية لتقليل البحث اليدوي وتسريع القرار."
        actions={
          spotlightFilter ? (
            <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2" onClick={onClearSpotlightFilter}>
              <X size={16} />
              إلغاء الفلتر الذكي
            </button>
          ) : null
        }
      >
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          {[
            {
              id: "expiring_subscriptions",
              title: "اشتراكات تحتاج متابعة",
              value: expiringSoon.length,
              description: "مدارس بقي على اشتراكها 30 يوماً أو أقل.",
              actionLabel: "فتح الاشتراكات",
              tint: "#F2A93B",
              softTint: "rgba(242,169,59,0.14)",
              onClick: () => onFocusSpotlight("expiring_subscriptions", "subscriptions"),
            },
            {
              id: "inactive_schools",
              title: "مدارس غير نشطة",
              value: inactiveSchools.length,
              description: "مدارس موقوفة وتحتاج قرار إعادة تفعيل أو أرشفة.",
              actionLabel: "فتح المدارس",
              tint: "#F05A5A",
              softTint: "rgba(240,90,90,0.14)",
              onClick: () => onFocusSpotlight("inactive_schools", "schools"),
            },
            {
              id: "orphan_users",
              title: "مستخدمون بلا مدرسة",
              value: usersWithoutSchool.length,
              description: "حسابات تشغيلية قد تسبب التباساً في الصلاحيات والنطاق.",
              actionLabel: "فتح المستخدمين",
              tint: "#8B5CF6",
              softTint: "rgba(139,92,246,0.14)",
              onClick: () => onFocusSpotlight("orphan_users", "users"),
            },
            {
              id: "missing_branding",
              title: "هوية مدارس ناقصة",
              value: schoolsMissingBranding.length,
              description: "مدارس لا تملك ألواناً كاملة وبالتالي تظهر بهوية افتراضية.",
              actionLabel: "مراجعة الهوية",
              tint: "#4F8CFF",
              softTint: "rgba(79,140,255,0.14)",
              onClick: () => onFocusSpotlight("missing_branding", "schools"),
            },
          ].map((item) => (
            <div key={item.id} className="ui-surface rounded-[26px] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                  <div className="text-3xl font-black" style={{ color: item.tint }}>
                    {item.value}
                  </div>
                  <p className="text-sm leading-7 text-[var(--text-secondary)]">{item.description}</p>
                </div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px]" style={{ background: item.softTint, color: item.tint }}>
                  <AlertTriangle size={18} />
                </div>
              </div>
              <button type="button" className="ui-button ui-button--secondary mt-5 inline-flex items-center gap-2" onClick={item.onClick}>
                <ChevronLeft size={16} />
                {item.actionLabel}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="توزيع المدارس والمستخدمين" description="لقطة سريعة على الباقات والأدوار لمعرفة التوازن التشغيلي داخل المنصة.">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="mb-4">
                <h3 className="text-sm font-black text-[var(--text-primary)]">المدارس حسب الباقة</h3>
                <p className="text-xs font-bold text-[var(--text-tertiary)]">مقارنة سريعة بين الخطط المفعّلة</p>
              </div>
              <div className="h-[270px]">
                <PlanDistributionChart data={planData} />
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="mb-4">
                <h3 className="text-sm font-black text-[var(--text-primary)]">المستخدمون حسب الدور</h3>
                <p className="text-xs font-bold text-[var(--text-tertiary)]">توزيع الصلاحيات على الهيكل التشغيلي</p>
              </div>
              <div className="h-[270px]">
                <RoleDistributionChart data={roleData} />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="صحة الاشتراكات" description="التجديدات القريبة والاشتراكات الموقوفة تحتاج متابعة مستمرة.">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="h-[260px] rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <SubscriptionHealthPieChart data={subscriptionHealthData} />
            </div>

            <div className="space-y-3">
              {subscriptionHealthData.map((item) => (
                <div key={item.name} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-[var(--text-primary)]">{item.name}</span>
                    <span className="text-xl font-black" style={{ color: item.fill }}>
                      {item.value}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[rgba(79,140,255,0.08)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${subscriptions.length === 0 ? 0 : (item.value / subscriptions.length) * 100}%`,
                        background: item.fill,
                      }}
                    />
                  </div>
                </div>
              ))}

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
                  <AlertTriangle size={16} className="text-[var(--warning)]" />
                  أولوية هذا الأسبوع
                </div>
                <p className="text-sm leading-7 text-[var(--text-secondary)]">
                  {expiringSoon.length > 0
                    ? `يوجد ${expiringSoon.length} اشتراكاً يحتاج تواصلاً استباقياً قبل انتهاء الفترة الحالية.`
                    : "لا توجد اشتراكات على وشك الانتهاء خلال الثلاثين يوماً القادمة."}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="مدارس تحتاج انتباهاً"
          description="نظرة مركزة على المدارس التي شارفت اشتراكاتها على الانتهاء أو تم إيقافها."
          actions={
            <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2" onClick={() => onSetActiveTab("schools")}>
              عرض كل المدارس
            </button>
          }
        >
          <div className="space-y-3">
            {schools
              .filter((school) => {
                const subscription = subscriptions.find((item) => item.school_id === school.id);
                const days = calculateDaysLeft(subscription?.end_date);
                return !school.is_active || isSubscriptionExpired(subscription) || (days !== null && days <= 30);
              })
              .slice(0, 4)
              .map((school) => {
                const subscription = subscriptions.find((item) => item.school_id === school.id);
                const days = calculateDaysLeft(subscription?.end_date);
                const tone = !school.is_active || isSubscriptionExpired(subscription) ? "danger" : days !== null && days <= 30 ? "warning" : "success";

                return (
                  <div key={school.id} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-base font-black text-[var(--text-primary)]">{school.name}</div>
                        <div className="text-sm leading-7 text-[var(--text-secondary)]">
                          {school.city || "مدينة غير محددة"} · {school.owner_email || "بدون بريد مدير"}
                        </div>
                      </div>
                      <span className={statusTone(tone)}>
                        {tone === "danger" ? (!school.is_active ? "المدرسة موقوفة" : "الاشتراك منتهي") : tone === "warning" ? `${days} يوم متبقي` : "نشط"}
                      </span>
                    </div>
                  </div>
                );
              })}

            {schools.length === 0 ? (
              <EmptyState icon={School} title="لا توجد مدارس بعد" description="ابدأ بإضافة أول مدرسة ليظهر ملخص الاشتراك والحالة التشغيلية هنا." actionLabel="إضافة مدرسة" onAction={onOpenCreateSchool} />
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="آخر النشاطات" description="إضافات المدارس والمستخدمين الأحدث لتتبع التغييرات الأخيرة.">
          <div className="space-y-3">
            {recentSchools.map((school) => (
              <div key={school.id} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-[var(--text-primary)]">{school.name}</div>
                  <div className="text-xs font-bold text-[var(--text-tertiary)]">{formatDate(school.created_at)}</div>
                </div>
                <div className="text-sm leading-7 text-[var(--text-secondary)]">
                  {PLAN_LABELS[school.plan]} · {school.city || "المدينة غير محددة"}
                </div>
              </div>
            ))}

            {recentUsers.map((user) => (
              <div key={user.id} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-[var(--text-primary)]">{user.full_name || user.email || "مستخدم جديد"}</div>
                  <div className="text-xs font-bold text-[var(--text-tertiary)]">{formatDate(user.created_at)}</div>
                </div>
                <div className="text-sm leading-7 text-[var(--text-secondary)]">
                  {ROLE_LABELS[user.role]} · {relationName(user.schools) || "كل المدارس"}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
