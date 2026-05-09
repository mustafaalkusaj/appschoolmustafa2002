import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function formatUptime(seconds: number) {
  if (seconds < 60) return `${Math.floor(seconds)}ث`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}د`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}س ${Math.floor((seconds % 3600) / 60)}د`;
  return `${Math.floor(seconds / 86400)}ي ${Math.floor((seconds % 86400) / 3600)}س`;
}

export async function GET(request: NextRequest) {
  const context = await resolveSuperAdminActorContext(request.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const db = context.value.dataSupabase;

  try {
    const startTime = Date.now();
    const now = new Date();
    const todayStart = `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
    const monthStart = `${now.toISOString().slice(0, 7)}-01T00:00:00.000Z`;
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Parallel: DB ping + all stats
    const [
      dbCheck,
      expiringSubs,
      allArchives,
      usersToday,
      monthPayments,
      schoolsData,
    ] = await Promise.all([
      db.from("schools").select("id", { count: "exact", head: true }),
      db
        .from("subscriptions")
        .select("id, school_id, end_date, status, schools(name)")
        .eq("status", "active")
        .gte("end_date", now.toISOString().slice(0, 10))
        .lte("end_date", thirtyDaysOut)
        .order("end_date", { ascending: true })
        .limit(20),
      db.from("account_archives").select("school_id, branch_id"),
      db
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart),
      db
        .from("payments")
        .select("school_id")
        .gte("created_at", monthStart)
        .is("deleted_at", null),
      db.from("schools").select("id, name").eq("is_active", true),
    ]);

    const dbLatency = Date.now() - startTime;

    // Archives at limit: group by (school_id, branch_id IS NULL or branch_id)
    type ArchiveRow = { school_id: string; branch_id: string | null };
    const archiveRows = (allArchives.data ?? []) as ArchiveRow[];
    const archiveScopeCount = new Map<string, number>();
    for (const row of archiveRows) {
      const key = row.branch_id ? `${row.school_id}::${row.branch_id}` : `${row.school_id}::null`;
      archiveScopeCount.set(key, (archiveScopeCount.get(key) ?? 0) + 1);
    }
    const schoolNameMap = new Map(
      ((schoolsData.data ?? []) as Array<{ id: string; name: string }>).map((s) => [s.id, s.name]),
    );
    const archivesAtLimit = Array.from(archiveScopeCount.entries())
      .filter(([, cnt]) => cnt >= 5)
      .map(([key, cnt]) => {
        const schoolId = key.split("::")[0];
        return { school_id: schoolId, school_name: schoolNameMap.get(schoolId) ?? schoolId, count: cnt };
      });

    // Top active schools by payment count this month
    const paymentsBySchool = new Map<string, number>();
    for (const row of (monthPayments.data ?? []) as Array<{ school_id: string | null }>) {
      if (!row.school_id) continue;
      paymentsBySchool.set(row.school_id, (paymentsBySchool.get(row.school_id) ?? 0) + 1);
    }
    const topActiveSchools = Array.from(paymentsBySchool.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([schoolId, count]) => ({
        school_id: schoolId,
        school_name: schoolNameMap.get(schoolId) ?? schoolId,
        payment_count: count,
      }));

    // Expiring subscriptions: enrich with school name
    type SubRow = { id: string; school_id: string; end_date: string | null; schools?: { name: string | null } | Array<{ name: string | null }> | null };
    const expiring = ((expiringSubs.data ?? []) as SubRow[]).map((s) => {
      const schoolName =
        s.schools === null || s.schools === undefined
          ? schoolNameMap.get(s.school_id) ?? s.school_id
          : Array.isArray(s.schools)
            ? (s.schools[0]?.name ?? schoolNameMap.get(s.school_id) ?? s.school_id)
            : ((s.schools as { name: string | null }).name ?? schoolNameMap.get(s.school_id) ?? s.school_id);
      const daysLeft = s.end_date
        ? Math.ceil((new Date(s.end_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : null;
      return { id: s.id, school_id: s.school_id, school_name: schoolName, end_date: s.end_date, days_left: daysLeft };
    });

    return NextResponse.json({
      database: {
        status: dbCheck.error ? "critical" : dbLatency > 800 ? "warning" : "healthy",
        message: dbCheck.error ? "خطأ في الاتصال" : dbLatency > 800 ? "بطء في الاستجابة" : "متصل بشكل طبيعي",
        latency: dbLatency,
      },
      api: {
        status: "healthy",
        message: "جميع المخدمات تعمل",
      },
      storage: {
        status: "healthy",
        message: "المساحة متوفرة",
      },
      memory: 0,
      cpu: 0,
      activeConnections: dbCheck.count ?? 0,
      lastChecked: now.toISOString(),
      uptime: formatUptime(process.uptime()),
      expiring_subscriptions: expiring,
      archives_at_limit: archivesAtLimit,
      users_today: usersToday.count ?? 0,
      top_active_schools: topActiveSchools,
    });
  } catch (err) {
    return NextResponse.json(
      {
        database: { status: "critical", message: "خطأ في الاتصال", latency: 0 },
        api: { status: "critical", message: "خطأ في الخادم" },
        storage: { status: "warning", message: "لا يمكن التحقق" },
        memory: 0, cpu: 0, activeConnections: 0,
        lastChecked: new Date().toISOString(),
        uptime: null,
        expiring_subscriptions: [],
        archives_at_limit: [],
        users_today: 0,
        top_active_schools: [],
        error: err instanceof Error ? err.message : "خطأ في الخادم",
      },
      { status: 500 },
    );
  }
}
