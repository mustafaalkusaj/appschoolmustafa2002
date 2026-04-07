"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const PLAN_LABELS: Record<string, string> = {
  basic: "أساسية",
  premium: "مميزة",
  enterprise: "مؤسسية",
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetchSubscriptions();
  }, []);

  const latestSubscriptions = useMemo(() => {
    const map = new Map<string, any>();
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
    setSubscriptions(data || []);
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

    setMessage("تم تجديد الاشتراك وتفعيل المدرسة.");
    void fetchSubscriptions();
    setTimeout(() => setMessage(""), 2500);
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
      <div className="app-layout">
        <AppSidebar currentPath="/subscriptions" />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">الاشتراكات</h1>
            <p className="text-sm text-[var(--text-secondary)]">متابعة اشتراكات المدارس وتجديدها</p>
          </div>

          {message && (
            <div className="msg-success mb-4">
              {message}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="kpi-card">
              <div className="kpi-card__label">إجمالي الاشتراكات</div>
              <div className="kpi-card__value">{overview.total}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card__label">الاشتراكات النشطة</div>
              <div className="kpi-card__value text-[var(--success)]">{overview.active}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card__label">الاشتراكات المنتهية</div>
              <div className="kpi-card__value text-[var(--danger)]">{overview.expired}</div>
            </div>
          </section>

          <div className="content-card">
            <div className="content-card__header">
              <h2 className="content-card__title">تفاصيل الاشتراكات</h2>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-[var(--text-tertiary)]">جارٍ تحميل الاشتراكات...</div>
            ) : latestSubscriptions.length === 0 ? (
              <div className="p-6 text-sm text-[var(--text-tertiary)]">لا توجد اشتراكات.</div>
            ) : (
              <div className="content-card__body--flush">
                {latestSubscriptions.map((sub) => {
                  const status = (sub.status || "").toLowerCase();
                  const expiredByDate = sub.end_date && new Date(sub.end_date).getTime() < Date.now();
                  const expired = status !== "active" || expiredByDate;
                  return (
                    <div key={sub.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0">
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">{sub.schools?.name || "مدرسة غير معروفة"}</div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          الباقة: {PLAN_LABELS[sub.plan] || "أساسية"} • تاريخ الانتهاء: {sub.end_date || "غير محدد"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`badge ${expired ? "badge--danger" : "badge--success"}`}>
                          {expired ? "منتهي" : "نشط"}
                        </span>

                        {expired && (
                          <button
                            className="ui-button ui-button--primary h-8 px-3 text-sm"
                            onClick={() => renewSubscription(sub.school_id)}
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
    </ProtectedRoute>
  );
}
