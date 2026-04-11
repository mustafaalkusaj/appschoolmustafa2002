"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { AppShellTopbar } from "@/components/AppShellTopbar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { formatNumber } from "@/lib/formatting";
import { getLocaleFromPath } from "@/lib/locale-routing";
import {
  AlertTriangle,
  Building2,
  Loader2,
  MapPin,
  Power,
  RefreshCw,
  School,
  ShieldCheck,
} from "@/lib/icons";

type SchoolRecord = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  owner_email: string | null;
  logo_url: string | null;
  plan: "basic" | "premium" | "enterprise";
  is_active: boolean;
  created_at?: string | null;
};

type SubscriptionRecord = {
  id: string;
  school_id: string;
  status: string | null;
  end_date: string | null;
  start_date?: string | null;
};

type SchoolsResponse = {
  ok?: boolean;
  schools?: SchoolRecord[];
  subscriptions?: SubscriptionRecord[];
  error?: { message?: string };
};

type ActionResponse = {
  ok?: boolean;
  error?: { message?: string };
};

type LocaleCopy = {
  title: string;
  subtitle: string;
  loading: string;
  empty: string;
  loadFailed: string;
  renewSuccess: string;
  activateSuccess: string;
  suspendSuccess: string;
  renewFailed: string;
  toggleFailed: string;
  stats: {
    total: string;
    active: string;
    expired: string;
  };
  actions: {
    refresh: string;
    activate: string;
    suspend: string;
    renew: string;
    renewing: string;
    updating: string;
  };
  labels: {
    schools: string;
    location: string;
    owner: string;
    phone: string;
    joined: string;
    status: string;
    plan: string;
    subscriptionEnds: string;
    noDate: string;
    noCity: string;
    unknownOwner: string;
    inactive: string;
    active: string;
    expired: string;
    activeSubscription: string;
    noSubscription: string;
  };
};

const COPY: Record<"ar" | "en", LocaleCopy> = {
  ar: {
    title: "إدارة المدارس",
    subtitle: "لوحة موحّدة لإدارة المدارس والاشتراكات وحالة التفعيل من نفس نظام التصميم.",
    loading: "جارٍ تحميل المدارس...",
    empty: "لا توجد مدارس لعرضها حالياً.",
    loadFailed: "تعذر تحميل بيانات المدارس.",
    renewSuccess: "تم تجديد الاشتراك لمدة سنة كاملة.",
    activateSuccess: "تم تفعيل المدرسة ومزامنة اشتراكها.",
    suspendSuccess: "تم إيقاف المدرسة وتعليق اشتراكها الحالي.",
    renewFailed: "تعذر تجديد الاشتراك.",
    toggleFailed: "تعذر تحديث حالة المدرسة.",
    stats: {
      total: "إجمالي المدارس",
      active: "المدارس النشطة",
      expired: "اشتراكات منتهية",
    },
    actions: {
      refresh: "تحديث",
      activate: "تفعيل",
      suspend: "إيقاف",
      renew: "تجديد الاشتراك",
      renewing: "جارٍ التجديد...",
      updating: "جارٍ التحديث...",
    },
    labels: {
      schools: "قائمة المدارس",
      location: "الموقع",
      owner: "المالك",
      phone: "الهاتف",
      joined: "تاريخ الإنشاء",
      status: "الحالة",
      plan: "الخطة",
      subscriptionEnds: "ينتهي الاشتراك",
      noDate: "غير محدد",
      noCity: "مدينة غير محددة",
      unknownOwner: "غير محدد",
      inactive: "موقوفة",
      active: "نشطة",
      expired: "منتهي",
      activeSubscription: "ساري",
      noSubscription: "بدون اشتراك",
    },
  },
  en: {
    title: "Schools Management",
    subtitle: "A unified control surface for school operations, subscription health, and activation state.",
    loading: "Loading schools...",
    empty: "No schools are available yet.",
    loadFailed: "Failed to load schools data.",
    renewSuccess: "The subscription was renewed for one full year.",
    activateSuccess: "The school has been activated and its subscription was synced.",
    suspendSuccess: "The school has been suspended and its current subscription was synced.",
    renewFailed: "Failed to renew the subscription.",
    toggleFailed: "Failed to update the school status.",
    stats: {
      total: "Total schools",
      active: "Active schools",
      expired: "Expired subscriptions",
    },
    actions: {
      refresh: "Refresh",
      activate: "Activate",
      suspend: "Suspend",
      renew: "Renew subscription",
      renewing: "Renewing...",
      updating: "Updating...",
    },
    labels: {
      schools: "School roster",
      location: "Location",
      owner: "Owner",
      phone: "Phone",
      joined: "Created",
      status: "Status",
      plan: "Plan",
      subscriptionEnds: "Subscription ends",
      noDate: "Not set",
      noCity: "City not set",
      unknownOwner: "Not set",
      inactive: "Suspended",
      active: "Active",
      expired: "Expired",
      activeSubscription: "Current",
      noSubscription: "No subscription",
    },
  },
};

function resolveApiError(payload: ActionResponse | SchoolsResponse | null, fallback: string) {
  return payload?.error?.message?.trim() || fallback;
}

function isExpiredSubscription(subscription: SubscriptionRecord | null | undefined) {
  if (!subscription?.end_date) {
    return !subscription || (subscription.status || "").toLowerCase() !== "active";
  }

  const status = (subscription.status || "").toLowerCase();
  if (status && status !== "active") {
    return true;
  }

  const expiresAt = new Date(subscription.end_date);
  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  expiresAt.setHours(23, 59, 59, 999);
  return expiresAt.getTime() < Date.now();
}

function formatDateLabel(value: string | null | undefined, locale: "ar" | "en", fallback: string) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function SchoolsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) === "en" ? "en" : "ar";
  const copy = COPY[locale];
  const isRTL = locale === "ar";

  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const latestSubscriptionsBySchool = useMemo(() => {
    const map = new Map<string, SubscriptionRecord>();
    for (const subscription of subscriptions) {
      if (!map.has(subscription.school_id)) {
        map.set(subscription.school_id, subscription);
      }
    }
    return map;
  }, [subscriptions]);

  const fetchSchools = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<SchoolsResponse>(
        "/api/web/super-admin/schools",
      );

      if (!response.ok || !payload?.ok) {
        throw new Error(resolveApiError(payload, copy.loadFailed));
      }

      setSchools(payload.schools ?? []);
      setSubscriptions(payload.subscriptions ?? []);
    } catch (fetchError) {
      setSchools([]);
      setSubscriptions([]);
      setError(fetchError instanceof Error ? fetchError.message : copy.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy.loadFailed]);

  useEffect(() => {
    void fetchSchools();
  }, [fetchSchools]);

  const overview = useMemo(() => {
    const active = schools.filter((school) => school.is_active).length;
    const expired = schools.filter((school) =>
      isExpiredSubscription(latestSubscriptionsBySchool.get(school.id)),
    ).length;

    return {
      total: schools.length,
      active,
      expired,
    };
  }, [latestSubscriptionsBySchool, schools]);

  const metricsCards = [
    {
      label: copy.stats.total,
      value: formatNumber(overview.total),
      icon: School,
      tone: "text-[var(--primary)]",
      bg: "bg-[var(--primary)]/10",
    },
    {
      label: copy.stats.active,
      value: formatNumber(overview.active),
      icon: ShieldCheck,
      tone: "text-[var(--success)]",
      bg: "bg-[var(--success)]/10",
    },
    {
      label: copy.stats.expired,
      value: formatNumber(overview.expired),
      icon: AlertTriangle,
      tone: "text-[var(--warning)]",
      bg: "bg-[var(--warning)]/10",
    },
  ];

  async function handleToggleSchool(school: SchoolRecord) {
    setPendingAction(`toggle:${school.id}`);
    setError("");
    setMessage("");

    try {
      const nextActive = !school.is_active;
      const { response, payload } = await fetchJsonWithAuthorizedSession<ActionResponse>(
        `/api/web/super-admin/schools/${school.id}`,
        {
          method: "PATCH",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            mode: "toggle",
            is_active: nextActive,
          }),
        },
      );

      if (!response.ok || !payload?.ok) {
        throw new Error(resolveApiError(payload, copy.toggleFailed));
      }

      setMessage(nextActive ? copy.activateSuccess : copy.suspendSuccess);
      await fetchSchools("refresh");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : copy.toggleFailed);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRenewSubscription(schoolId: string) {
    setPendingAction(`renew:${schoolId}`);
    setError("");
    setMessage("");

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<ActionResponse>(
        `/api/web/super-admin/subscriptions/${schoolId}`,
        {
          method: "POST",
          headers: withJsonHeaders(),
        },
      );

      if (!response.ok || !payload?.ok) {
        throw new Error(resolveApiError(payload, copy.renewFailed));
      }

      setMessage(copy.renewSuccess);
      await fetchSchools("refresh");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : copy.renewFailed);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <ProtectedRoute roles={["super_admin"]}>
      <div dir={isRTL ? "rtl" : "ltr"} className="layout min-h-screen bg-[var(--bg)]">
        <AppSidebar currentPath="/schools" />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppShellTopbar title={copy.title} subtitle={copy.subtitle} />

          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
              <section className="ui-glass overflow-hidden rounded-[32px] p-6 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
                      <Building2 size={14} />
                      {copy.title}
                    </div>
                    <h1 className="mt-4 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
                      {copy.title}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                      {copy.subtitle}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-[140px]"
                    onClick={() => void fetchSchools("refresh")}
                    disabled={refreshing || loading}
                  >
                    {refreshing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                    <span>{copy.actions.refresh}</span>
                  </Button>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {metricsCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.label}
                        className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                              {card.label}
                            </div>
                            <div className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                              {card.value}
                            </div>
                          </div>
                          <div className={cn("flex h-12 w-12 items-center justify-center rounded-[18px]", card.bg, card.tone)}>
                            <Icon size={20} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {message ? (
                <div className="rounded-[22px] border border-[var(--success)]/20 bg-[var(--success)]/10 px-4 py-3 text-sm font-bold text-[var(--success)]">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-[22px] border border-[var(--danger)]/20 bg-[var(--danger)]/10 px-4 py-3 text-sm font-bold text-[var(--danger)]">
                  {error}
                </div>
              ) : null}

              <section className="rounded-[30px] border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
                <div className="flex flex-col gap-3 border-b border-[var(--border)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      {copy.labels.schools}
                    </div>
                    <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                      {copy.labels.schools}
                    </h2>
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-secondary)]">
                    {formatNumber(schools.length)} {copy.labels.schools}
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm font-bold text-[var(--text-secondary)]">
                    <Loader2 className="animate-spin" size={18} />
                    <span>{copy.loading}</span>
                  </div>
                ) : schools.length === 0 ? (
                  <div className="px-6 py-16 text-center text-sm font-semibold text-[var(--text-secondary)]">
                    {copy.empty}
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {schools.map((school) => {
                      const subscription = latestSubscriptionsBySchool.get(school.id) ?? null;
                      const expired = isExpiredSubscription(subscription);
                      const actionKey = pendingAction?.split(":");
                      const isUpdating = actionKey?.[0] === "toggle" && actionKey?.[1] === school.id;
                      const isRenewing = actionKey?.[0] === "renew" && actionKey?.[1] === school.id;

                      return (
                        <article key={school.id} className="px-6 py-5">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-xl font-black text-[var(--text-primary)]">
                                  {school.name}
                                </h3>
                                <span
                                  className={cn(
                                    "rounded-full px-3 py-1 text-xs font-black",
                                    school.is_active
                                      ? "bg-[var(--success)]/10 text-[var(--success)]"
                                      : "bg-[var(--danger)]/10 text-[var(--danger)]",
                                  )}
                                >
                                  {school.is_active ? copy.labels.active : copy.labels.inactive}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full px-3 py-1 text-xs font-black",
                                    expired
                                      ? "bg-[var(--warning)]/10 text-[var(--warning)]"
                                      : "bg-[var(--primary)]/10 text-[var(--primary)]",
                                  )}
                                >
                                  {expired ? copy.labels.expired : copy.labels.activeSubscription}
                                </span>
                              </div>

                              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                <div className="rounded-[20px] bg-[var(--surface-muted)] px-4 py-3">
                                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    {copy.labels.location}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                                    <MapPin size={14} className="text-[var(--text-muted)]" />
                                    <span>{school.city || copy.labels.noCity}</span>
                                  </div>
                                </div>
                                <div className="rounded-[20px] bg-[var(--surface-muted)] px-4 py-3">
                                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    {copy.labels.owner}
                                  </div>
                                  <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                                    {school.owner_email || copy.labels.unknownOwner}
                                  </div>
                                </div>
                                <div className="rounded-[20px] bg-[var(--surface-muted)] px-4 py-3">
                                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    {copy.labels.phone}
                                  </div>
                                  <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                                    {school.phone || copy.labels.unknownOwner}
                                  </div>
                                </div>
                                <div className="rounded-[20px] bg-[var(--surface-muted)] px-4 py-3">
                                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    {copy.labels.plan}
                                  </div>
                                  <div className="mt-2 text-sm font-semibold uppercase text-[var(--text-primary)]">
                                    {school.plan}
                                  </div>
                                </div>
                                <div className="rounded-[20px] bg-[var(--surface-muted)] px-4 py-3">
                                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    {copy.labels.subscriptionEnds}
                                  </div>
                                  <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                                    {subscription
                                      ? formatDateLabel(subscription.end_date, locale, copy.labels.noDate)
                                      : copy.labels.noSubscription}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-5 text-xs font-semibold text-[var(--text-secondary)]">
                                <span>
                                  {copy.labels.joined}:{" "}
                                  {formatDateLabel(school.created_at, locale, copy.labels.noDate)}
                                </span>
                                <span>
                                  {copy.labels.status}:{" "}
                                  {school.is_active ? copy.labels.active : copy.labels.inactive}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <Button
                                type="button"
                                variant={school.is_active ? "outline" : "primary"}
                                onClick={() => void handleToggleSchool(school)}
                                disabled={Boolean(pendingAction)}
                                className="min-w-[140px]"
                              >
                                {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Power size={16} />}
                                <span>{isUpdating ? copy.actions.updating : school.is_active ? copy.actions.suspend : copy.actions.activate}</span>
                              </Button>

                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => void handleRenewSubscription(school.id)}
                                disabled={Boolean(pendingAction)}
                                className="min-w-[180px]"
                              >
                                {isRenewing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                <span>{isRenewing ? copy.actions.renewing : copy.actions.renew}</span>
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
