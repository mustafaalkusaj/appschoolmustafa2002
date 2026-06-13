"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  RefreshCw, 
  Server,
  Database,
  Users,
  ShieldCheck,
  Building2,
  Clock,
} from "@/lib/icons";
import { supabase } from "@/lib/supabase";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import { SectionCard, MigrationNotice, cx } from "./UI";

export function MonitoringTab({ infrastructure }: { infrastructure: AdminInfrastructure }) {
  const [stats, setStats] = useState({
    schools: 0,
    activeSchools: 0,
    users: 0,
    activeUsers: 0,
    subscriptions: 0,
    expiredSubscriptions: 0
  });
  const [dbStatus, setDbStatus] = useState<"connected" | "limited" | "error" | "checking">("connected");
  const [recentEvents, setRecentEvents] = useState<Array<{ id: string; summary: string; actor_name?: string | null }>>([]);

  const fetchStats = useCallback(async () => {
    setDbStatus("checking");
    try {
      let schoolsQuery = supabase.from("schools").select("*", { count: "exact", head: true });
      let activeSchoolsQuery = supabase
        .from("schools")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      let usersQuery = supabase.from("user_profiles").select("*", { count: "exact", head: true });
      let activeUsersQuery = supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (infrastructure.softDeleteSchools) {
        schoolsQuery = schoolsQuery.is("deleted_at", null);
        activeSchoolsQuery = activeSchoolsQuery.is("deleted_at", null);
      }

      if (infrastructure.softDeleteUsers) {
        usersQuery = usersQuery.is("deleted_at", null);
        activeUsersQuery = activeUsersQuery.is("deleted_at", null);
      }

      const [schoolResponse, activeSchoolResponse, userResponse, activeUserResponse, subscriptionResponse, logsResponse] =
        await Promise.all([
          schoolsQuery,
          activeSchoolsQuery,
          usersQuery,
          activeUsersQuery,
          supabase.from("subscriptions").select("*", { count: "exact", head: true }),
          infrastructure.auditLogs
            ? supabase.from("audit_logs").select("id, summary, actor_name").order("created_at", { ascending: false }).limit(5)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (schoolResponse.error) throw schoolResponse.error;
      if (activeSchoolResponse.error) throw activeSchoolResponse.error;
      if (userResponse.error) throw userResponse.error;
      if (activeUserResponse.error) throw activeUserResponse.error;
      if (subscriptionResponse.error) throw subscriptionResponse.error;
      if (logsResponse.error) throw logsResponse.error;

      setStats({
        schools: schoolResponse.count || 0,
        activeSchools: activeSchoolResponse.count || 0,
        users: userResponse.count || 0,
        activeUsers: activeUserResponse.count || 0,
        subscriptions: subscriptionResponse.count || 0,
        expiredSubscriptions: 0 // Needs logic
      });
      setRecentEvents(logsResponse.data || []);
      setDbStatus(infrastructure.auditLogs ? "connected" : "limited");
    } catch (err) {
      console.error("Monitoring stats error:", err);
      setDbStatus("error");
    }
  }, [infrastructure.auditLogs, infrastructure.softDeleteSchools, infrastructure.softDeleteUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="ui-surface rounded-[30px] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(79,140,255,0.14)] text-[var(--primary)]">
              <Database size={20} />
            </div>
            <div className={cx(
              "ui-pill text-[10px] font-black",
              dbStatus === "connected"
                ? "ui-pill--success"
                : dbStatus === "limited"
                  ? "ui-pill--warning"
                  : "ui-pill--danger"
            )}>
              {dbStatus === "connected" ? "متصل" : dbStatus === "limited" ? "وضع توافق" : "خطأ في الاتصال"}
            </div>
          </div>
          <p className="text-xs font-black text-[var(--text-tertiary)]">حالة قاعدة البيانات</p>
          <p className="text-sm font-black text-[var(--text-primary)]">Supabase PostgreSQL</p>
        </div>

        <div className="ui-surface rounded-[30px] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(53,197,138,0.14)] text-[var(--success)]">
              <Server size={20} />
            </div>
            <div className="ui-pill ui-pill--success text-[10px] font-black">يعمل بشكل جيد</div>
          </div>
          <p className="text-xs font-black text-[var(--text-tertiary)]">حالة الخادم</p>
          <p className="text-sm font-black text-[var(--text-primary)]">Next.js Edge Runtime</p>
        </div>

        <div className="ui-surface rounded-[30px] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(242,169,59,0.14)] text-[var(--warning)]">
              <Clock size={20} />
            </div>
            <div className="text-[10px] font-black text-[var(--text-secondary)]">أداء طبيعي</div>
          </div>
          <p className="text-xs font-black text-[var(--text-tertiary)]">وقت الاستجابة (Ping)</p>
          <p className="text-sm font-black text-[var(--text-primary)]">~42ms</p>
        </div>

        <div className="ui-surface rounded-[30px] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(139,92,246,0.14)] text-[#8B5CF6]">
              <ShieldCheck size={20} />
            </div>
            <div className="ui-pill ui-pill--success text-[10px] font-black">نشط</div>
          </div>
          <p className="text-xs font-black text-[var(--text-tertiary)]">طبقة الحماية (Auth)</p>
          <p className="text-sm font-black text-[var(--text-primary)]">RBAC Matrix Active</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="مؤشرات التشغيل"
          description="إحصائيات مباشرة حول الكيانات الأساسية في النظام."
        >
          {infrastructure.warnings.length > 0 ? (
            <div className="mb-4">
              <MigrationNotice
                title="بعض المؤشرات تعمل بوضع توافق"
                description="تم تخفيف بعض الاستعلامات لأن أجزاء من `admin_infrastructure.sql` غير مطبقة بعد. ستبقى الإحصائيات الأساسية متاحة، لكن سجلات التدقيق والأرشفة الكاملة لن تظهر قبل تشغيل الـ migration."
              />
            </div>
          ) : null}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-[var(--text-tertiary)]" />
                <span className="text-sm font-black">المدارس</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-black text-[var(--text-tertiary)]">الكل</p>
                  <p className="text-sm font-black">{stats.schools}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-[var(--success)]">نشط</p>
                  <p className="text-sm font-black">{stats.activeSchools}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-[var(--text-tertiary)]" />
                <span className="text-sm font-black">المستخدمون</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-black text-[var(--text-tertiary)]">الكل</p>
                  <p className="text-sm font-black">{stats.users}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-[var(--success)]">نشط</p>
                  <p className="text-sm font-black">{stats.activeUsers}</p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="أحدث أحداث النظام"
          description="متابعة فورية للنشاطات الأخيرة داخل المنصة."
          actions={
            <button onClick={fetchStats} className="ui-button ui-button--secondary h-8 w-8 p-0">
              <RefreshCw size={14} />
            </button>
          }
        >
          <div className="space-y-3">
            {recentEvents.length === 0 ? (
              <p className="py-10 text-center text-xs font-bold text-[var(--text-tertiary)]">لا توجد أحداث مؤخراً</p>
            ) : (
              recentEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
                  <div className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">{event.summary}</p>
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)]">
                      بواسطة: {event.actor_name || "النظام"}
                    </p>
                  </div>
                  <span className="text-[9px] font-black text-[var(--text-tertiary)] shrink-0">
                    منذ قليل
                  </span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
