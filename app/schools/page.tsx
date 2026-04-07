"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function SchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetchAll();
  }, []);

  const latestSubscriptionsBySchool = useMemo(() => {
    const map = new Map<string, any>();
    for (const subscription of subscriptions) {
      if (!map.has(subscription.school_id)) {
        map.set(subscription.school_id, subscription);
      }
    }
    return map;
  }, [subscriptions]);

  async function fetchAll() {
    setLoading(true);
    const [{ data: schoolsData }, { data: subscriptionsData }] = await Promise.all([
      supabase.from("schools").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
    ]);
    setSchools(schoolsData || []);
    setSubscriptions(subscriptionsData || []);
    setLoading(false);
  }

  function getSubscriptionForSchool(schoolId: string) {
    return latestSubscriptionsBySchool.get(schoolId) || null;
  }

  async function toggleSchool(schoolId: string, isActive: boolean) {
    await supabase.from("schools").update({ is_active: !isActive }).eq("id", schoolId);
    const latestSubscription = getSubscriptionForSchool(schoolId);
    if (latestSubscription?.id) {
      await supabase
        .from("subscriptions")
        .update({ status: isActive ? "suspended" : "active" })
        .eq("id", latestSubscription.id);
    } else {
      await supabase.from("subscriptions").insert({
        school_id: schoolId,
        status: isActive ? "suspended" : "active",
      });
    }

    setMessage(isActive ? "تم إيقاف المدرسة بنجاح." : "تم تفعيل المدرسة بنجاح.");
    void fetchAll();
    setTimeout(() => setMessage(""), 2500);
  }

  async function renewSubscription(schoolId: string) {
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const latestSubscription = getSubscriptionForSchool(schoolId);
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

    setMessage("تم تجديد الاشتراك لمدة سنة.");
    void fetchAll();
    setTimeout(() => setMessage(""), 2500);
  }

  const overview = useMemo(() => {
    const activeSchools = schools.filter((school) => school.is_active).length;
    const expiredSubs = schools.filter((school) => {
      const sub = latestSubscriptionsBySchool.get(school.id);
      if (!sub) return true;
      if ((sub.status || "").toLowerCase() !== "active") return true;
      if (!sub.end_date) return false;
      return new Date(sub.end_date).getTime() < Date.now();
    }).length;

    return {
      total: schools.length,
      active: activeSchools,
      expired: expiredSubs,
    };
  }, [latestSubscriptionsBySchool, schools]);

  return (
    <ProtectedRoute roles={["super_admin"]}>
      <div className="app-layout">
        <AppSidebar currentPath="/schools" />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">إدارة المدارس</h1>
              <p className="text-sm text-[var(--text-secondary)]">لوحة تحكم المدير العام لإدارة المدارس والاشتراكات</p>
            </div>
          </div>

          {message && (
            <div className="msg-success mb-4">
              {message}
            </div>
          )}

          <section className="kpi-grid mb-6">
            <div className="kpi-card">
              <div className="kpi-card__label">إجمالي المدارس</div>
              <div className="kpi-card__value">{overview.total}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card__label">المدارس النشطة</div>
              <div className="kpi-card__value text-[var(--success)]">{overview.active}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card__label">الاشتراكات المنتهية</div>
              <div className="kpi-card__value text-[var(--danger)]">{overview.expired}</div>
            </div>
          </section>

          <div className="content-card">
            <div className="content-card__header">
              <h2 className="content-card__title">قائمة المدارس</h2>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-[var(--text-tertiary)]">جارٍ تحميل المدارس...</div>
            ) : schools.length === 0 ? (
              <div className="p-6 text-sm text-[var(--text-tertiary)]">لا توجد مدارس.</div>
            ) : (
              <div className="content-card__body--flush">
                {schools.map((school) => {
                  const sub = getSubscriptionForSchool(school.id);
                  const expired = !sub || (sub.status || "").toLowerCase() !== "active" || (sub.end_date && new Date(sub.end_date).getTime() < Date.now());
                  return (
                    <div key={school.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0">
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">{school.name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {school.city || "المدينة غير محددة"} • ينتهي الاشتراك في: {sub?.end_date || "غير محدد"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className={`ui-button h-8 px-3 text-sm ${school.is_active ? "ui-button--danger" : "ui-button--success"}`}
                          onClick={() => toggleSchool(school.id, school.is_active)}
                        >
                          {school.is_active ? "إيقاف" : "تفعيل"}
                        </button>

                        {expired && (
                          <button
                            className="ui-button ui-button--primary h-8 px-3 text-sm"
                            onClick={() => renewSubscription(school.id)}
                          >
                            تجديد الاشتراك
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
