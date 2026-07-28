import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminMobileRouteContext } from "@/lib/mobile-super-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveSuperAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { serviceSupabase } = context.value;

    const [
      studentsResult,
      teachersResult,
      adminsResult,
      inactiveResult,
      activitiesResult,
    ] = await Promise.all([
      serviceSupabase
        .from("students")
        .select("*", { count: "exact", head: true }),
      serviceSupabase
        .from("teachers")
        .select("*", { count: "exact", head: true }),
      serviceSupabase
        .from("managed_user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin"),
      serviceSupabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("status", "inactive"),
      serviceSupabase
        .from("notifications")
        .select("id, type, title, message, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const studentsCount = studentsResult.count ?? 0;
    const teachersCount = teachersResult.count ?? 0;
    const adminsCount = adminsResult.count ?? 0;
    const inactiveAccountsCount = inactiveResult.count ?? 0;

    const recentActivities = (activitiesResult.data ?? []).map((n) => ({
      id: n.id as string,
      type: "notification" as const,
      title: (n.title as string | null) ?? "",
      subtitle: (n.message as string | null) ?? "",
      timestamp: (n.created_at as string | null) ?? "",
    }));

    return NextResponse.json({
      ok: true,
      studentsCount,
      teachersCount,
      adminsCount,
      inactiveAccountsCount,
      recentActivities,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
