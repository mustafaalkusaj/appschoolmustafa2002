import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";
import { buildSchoolCacheTag, rememberWithTtl } from "@/lib/server-cache";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  timestamp: string;
};

async function buildAdminDashboard(schoolId: string) {
  const serviceSupabase = createServiceSupabaseClient();

  const [
    studentsResult,
    teachersResult,
    classesResult,
    notificationsResult,
    assignmentsResult,
  ] = await Promise.all([
    serviceSupabase
      .from("students")
      .select("id, status", { count: "exact" })
      .eq("school_id", schoolId),
    serviceSupabase
      .from("teachers")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    serviceSupabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    serviceSupabase
      // `notifications` records no sender: the column never existed and the
      // metadata payloads carry no sender either.
      .from("notifications")
      .select("id, title, message, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<
        {
          id: string;
          title: string | null;
          message: string | null;
          created_at: string | null;
        }[]
      >(),
    serviceSupabase
      .from("assignments")
      .select("id, title, subject, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const studentsData = studentsResult.data ?? [];
  const studentsCount = studentsResult.count ?? studentsData.length;
  const teachersCount = teachersResult.count ?? 0;
  const classesCount = classesResult.count ?? 0;

  const inactiveAccountsCount = studentsData.filter(
    (s) => (s as { status?: string }).status === "inactive",
  ).length;

  let sectionsCount = 0;
  try {
    const { count } = await serviceSupabase
      .from("sections")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId);
    sectionsCount = count ?? 0;
  } catch {
    sectionsCount = 0;
  }

  let overduePaymentsCount = 0;
  try {
    const { count } = await (
      serviceSupabase as unknown as {
        from: (table: string) => ReturnType<typeof serviceSupabase.from>;
      }
    )
      .from("student_payments")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .gt("remaining_fee", 0);
    overduePaymentsCount = count ?? 0;
  } catch {
    overduePaymentsCount = 0;
  }

  const notificationItems: ActivityItem[] = (
    notificationsResult.data ?? []
  ).map((n) => ({
    id: n.id as string,
    type: "notification",
    title: (n.title as string | null) ?? "",
    subtitle: (n.message as string | null) ?? "",
    timestamp: (n.created_at as string | null) ?? "",
  }));

  const assignmentItems: ActivityItem[] = (assignmentsResult.data ?? []).map(
    (a) => ({
      id: a.id as string,
      type: "assignment",
      title: (a.title as string | null) ?? "",
      subtitle: (a.subject as string | null) ?? "",
      timestamp: (a.created_at as string | null) ?? "",
    }),
  );

  const recentActivities = [...notificationItems, ...assignmentItems]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 10);

  return {
    studentsCount,
    teachersCount,
    classesCount,
    sectionsCount,
    inactiveAccountsCount,
    overduePaymentsCount,
    recentActivities,
  };
}

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { authUserId, schoolId } = context.value;
    const payload = await rememberWithTtl(
      `mobile:admin:dashboard:${authUserId}`,
      120_000,
      () => buildAdminDashboard(schoolId),
      { tags: [buildSchoolCacheTag(schoolId, "dashboard")] },
    );

    return NextResponse.json({ ok: true, ...payload });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
