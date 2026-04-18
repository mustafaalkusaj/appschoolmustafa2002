"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { formatNumber } from "@/lib/formatting";

const PLAN_LABELS: Record<string, string> = {
  basic: "أساسية",
  premium: "مميزة",
  enterprise: "مؤسسية",
};

type SchoolNameRelation = { name: string | null } | Array<{ name: string | null }> | null;

type SubscriptionRecord = {
  id: string;
  school_id: string;
  status: string | null;
  end_date: string | null;
  plan: string | null;
  schools: SchoolNameRelation;
};

function relationName(value: SchoolNameRelation) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.name ?? null;
  return value.name ?? null;
}

function formatEndDate(value: string | null) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    void fetchSubscriptions();
  }, []);

  const latestSubscriptions = useMemo(() => {
    const map = new Map<string, SubscriptionRecord>();
    for (const subscription of subscriptions) {
      if (!map.has(subscription.school_id)) {
        map.set(subscription.school_id, subscription);
      }
    }
    return Array.from(map.values());
  }, [subscriptions]);

  async function fetchSubscriptions() {
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*, schools(name)")
      .order("created_at", { ascending: false });
    setSubscriptions((data as SubscriptionRecord[] | null) || []);
    setLoading(false);
  }

  async function renewSubscription(schoolId: string) {
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const latestSubscription = latestSubscriptions.find((subscription) => subscription.school_id === schoolId);
    if (latestSubscription?.id) {
      await supabase
        .from("subscriptions")
        .update({ status: "active", end_date: endDate })
        .eq("id", latestSubscription.id);
    } else {
      await supabase.from("subscriptions").insert({
        school_id: schoolId,
        status: "active",
        end_date: endDate,
      });
    }

    await supabase
      .from("schools")
      .update({ is_active: true })
      .eq("id", schoolId);

    setMessage({ text: "تم تجديد الاشتراك وتفعيل المدرسة.", type: "success" });
    void fetchSubscriptions();
    setTimeout(() => setMessage(null), 3000);
  }

  const overview = useMemo(() => {
    const active = latestSubscriptions.filter((sub) => {
      const status = (sub.status || "").toLowerCase();
      if (status !== "active") return false;
      if (!sub.end_date) return true;
      return new Date(sub.end_date).getTime() >= Date.now();
    }).length;

    const expired = latestSubscriptions.filter((sub) => {
      const status = (sub.status || "").toLowerCase();
      if (status === "expired") return true;
      if (status !== "active") return true;
      if (!sub.end_date) return false;
      return new Date(sub.end_date).getTime() < Date.now();
    }).length;

    return { total: latestSubscriptions.length, active, expired };
  }, [latestSubscriptions]);

  return (
    <ProtectedRoute roles={["super_admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/subscriptions" showFloatingToggle />

        <div className="flex-1 min-w-0">
          <AppShellTopbar title="الاشتراكات" subtitle="متابعة اشتراكات المدارس وتجديدها" />

          <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 space-y-5">
            {message && (
              <div
                className={`rounded-[18px] border px-5 py-3.5 text-sm font-semibold ${
                  message.type === "success"
                    ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
                    : "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
                <div className="text-xs font-bold text-[var(--text-muted)]">إجمالي الاشتراكات</div>
                <div className="mt-3 text-3xl font-black text-[var(--text-primary)]">{formatNumber(overview.total)}</div>
              </div>
              <div className="rounded-[24px] border border-[var(--success)]/20 bg-[var(--success)]/5 p-5 shadow-[var(--card-shadow)]">
                <div className="text-xs font-bold text-[var(--success)]">الاشتراكات النشطة</div>
                <div className="mt-3 text-3xl font-black text-[var(--success)]">{formatNumber(overview.active)}</div>
              </div>
              <div className="rounded-[24px] border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-5 shadow-[var(--card-shadow)]">
                <div className="text-xs font-bold text-[var(--danger)]">الاشتراكات المنتهية</div>
                <div className="mt-3 text-3xl font-black text-[var(--danger)]">{formatNumber(overview.expired)}</div>
              </div>
            </div>

            {/* Subscriptions table */}
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h2 className="text-sm font-black text-[var(--text-primary)]">تفاصيل الاشتراكات</h2>
              </div>

              {loading ? (
                <div className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">
                  جارٍ تحميل الاشتراكات...
                </div>
              ) : latestSubscriptions.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">
                  لا توجد اشتراكات.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {latestSubscriptions.map((sub) => {
                    const status = (sub.status || "").toLowerCase();
                    const expiredByDate = sub.end_date && new Date(sub.end_date).getTime() < Date.now();
                    const expired = status !== "active" || expiredByDate;
                    return (
                      <div key={sub.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                        <div className="min-w-0">
                          <div className="font-bold text-[var(--text-primary)]">
                            {relationName(sub.schools) || "مدرسة غير معروفة"}
                          </div>
                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            الباقة: {(sub.plan ? PLAN_LABELS[sub.plan] : null) || "أساسية"}
                            {" • "}
                            الانتهاء: {formatEndDate(sub.end_date)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              expired
                                ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                                : "bg-[var(--success)]/10 text-[var(--success)]"
                            }`}
                          >
                            {expired ? "منتهي" : "نشط"}
                          </span>

                          {expired && (
                            <button
                              type="button"
                              className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-black text-white transition hover:opacity-90"
                              onClick={() => void renewSubscription(sub.school_id)}
                            >
                              تجديد
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
