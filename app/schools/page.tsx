"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

type SchoolRecord = {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
};

type SubscriptionRecord = {
  id: string;
  school_id: string;
  status: string | null;
  end_date: string | null;
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetchAll();
  }, []);

  const latestSubscriptionsBySchool = useMemo(() => {
    const map = new Map<string, SubscriptionRecord>();
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
    setSchools((schoolsData as SchoolRecord[] | null) || []);
    setSubscriptions((subscriptionsData as SubscriptionRecord[] | null) || []);
    setLoading(false);
  }

  function getSubscriptionForSchool(schoolId: string): SubscriptionRecord | null {
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
      <style>{`
        .layout{display:flex;height:100vh;background:#F5F3FF;color:#1F1547;font-family:Manrope,sans-serif;direction:rtl}
        .sidebar{width:220px;background:linear-gradient(180deg,#EDE8FA,#E0D8F8);display:flex;flex-direction:column;padding:1rem .8rem;border-left:1px solid rgba(108,74,182,0.12);flex-shrink:0}
        .logo{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem;padding:.4rem}
        .logo-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#6C4AB6,#9B7EDC);display:flex;align-items:center;justify-content:center}
        .logo-ico svg{width:18px;height:18px;fill:white}
        .logo span{font-size:.88rem;font-weight:800;color:#4C2F9E}
        .nav{display:flex;align-items:center;gap:.6rem;padding:.55rem .8rem;border-radius:9px;color:#4C2F9E;font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none;border:none;background:none;font-family:Cairo,sans-serif}
        .nav:hover{background:rgba(108,74,182,.1)}
        .nav.active{background:linear-gradient(135deg,#6C4AB6,#4C2F9E);color:white}
        .nav.danger{color:#EF4444}
        .nav.danger:hover{background:#FEE2E2}
        .sep{height:1px;background:rgba(108,74,182,.12);margin:.4rem 0}
      `}</style>

      <div className="layout">
        <AppSidebar currentPath="/schools" />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-purple-900">إدارة المدارس</h1>
              <p className="text-sm text-slate-500">لوحة تحكم المدير العام لإدارة المدارس والاشتراكات</p>
            </div>
          </div>

          {message && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm font-semibold">
              {message}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-white border border-purple-100 p-4">
              <div className="text-xs text-slate-500">إجمالي المدارس</div>
              <div className="text-2xl font-black text-purple-900">{overview.total}</div>
            </div>
            <div className="rounded-xl bg-white border border-purple-100 p-4">
              <div className="text-xs text-slate-500">المدارس النشطة</div>
              <div className="text-2xl font-black text-emerald-600">{overview.active}</div>
            </div>
            <div className="rounded-xl bg-white border border-purple-100 p-4">
              <div className="text-xs text-slate-500">الاشتراكات المنتهية</div>
              <div className="text-2xl font-black text-red-600">{overview.expired}</div>
            </div>
          </section>

          <section className="rounded-xl bg-white border border-purple-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-purple-100 font-bold text-purple-900">قائمة المدارس</div>
            {loading ? (
              <div className="p-6 text-sm text-slate-500">جارٍ تحميل المدارس...</div>
            ) : schools.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">لا توجد مدارس.</div>
            ) : (
              <div className="divide-y divide-purple-100">
                {schools.map((school) => {
                  const sub = getSubscriptionForSchool(school.id);
                  const expired = !sub || (sub.status || "").toLowerCase() !== "active" || (sub.end_date && new Date(sub.end_date).getTime() < Date.now());
                  return (
                    <div key={school.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{school.name}</div>
                        <div className="text-xs text-slate-500">
                          {school.city || "المدينة غير محددة"} • ينتهي الاشتراك في: {sub?.end_date || "غير محدد"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold ${school.is_active ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                          onClick={() => toggleSchool(school.id, school.is_active)}
                        >
                          {school.is_active ? "إيقاف" : "تفعيل"}
                        </button>

                        {expired && (
                          <button
                            className="px-3 py-1.5 rounded-lg text-sm font-bold bg-blue-100 text-blue-700"
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
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
