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

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
      <div className="layout">
        <AppSidebar currentPath="/subscriptions" />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-purple-900">الاشتراكات</h1>
            <p className="text-sm text-slate-500">متابعة اشتراكات المدارس وتجديدها</p>
          </div>

          {message && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm font-semibold">
              {message}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-white border border-purple-100 p-4">
              <div className="text-xs text-slate-500">إجمالي الاشتراكات</div>
              <div className="text-2xl font-black text-purple-900">{overview.total}</div>
            </div>
            <div className="rounded-xl bg-white border border-purple-100 p-4">
              <div className="text-xs text-slate-500">الاشتراكات النشطة</div>
              <div className="text-2xl font-black text-emerald-600">{overview.active}</div>
            </div>
            <div className="rounded-xl bg-white border border-purple-100 p-4">
              <div className="text-xs text-slate-500">الاشتراكات المنتهية</div>
              <div className="text-2xl font-black text-red-600">{overview.expired}</div>
            </div>
          </section>

          <section className="rounded-xl bg-white border border-purple-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-purple-100 font-bold text-purple-900">تفاصيل الاشتراكات</div>
            {loading ? (
              <div className="p-6 text-sm text-slate-500">جارٍ تحميل الاشتراكات...</div>
            ) : latestSubscriptions.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">لا توجد اشتراكات.</div>
            ) : (
              <div className="divide-y divide-purple-100">
                {latestSubscriptions.map((sub) => {
                  const status = (sub.status || "").toLowerCase();
                  const expiredByDate = sub.end_date && new Date(sub.end_date).getTime() < Date.now();
                  const expired = status !== "active" || expiredByDate;
                  return (
                    <div key={sub.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{relationName(sub.schools) || "مدرسة غير معروفة"}</div>
                        <div className="text-xs text-slate-500">
                          الباقة: {(sub.plan ? PLAN_LABELS[sub.plan] : null) || "أساسية"} • تاريخ الانتهاء: {sub.end_date || "غير محدد"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${expired ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {expired ? "منتهي" : "نشط"}
                        </span>

                        {expired && (
                          <button
                            className="px-3 py-1.5 rounded-lg text-sm font-bold bg-blue-100 text-blue-700"
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
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
