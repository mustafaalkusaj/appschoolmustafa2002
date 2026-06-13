import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

const ENDPOINT = "GET /api/web/mobile-app/overview";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

type CountRow = { school_id: string | null; role?: string | null };

export async function GET(request: NextRequest) {
  const context = await resolveSuperAdminActorContext(request.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const supabase = createServiceSupabaseClient();

  try {
    // Active push subscriptions = registered devices. Each row links to a user
    // (student/teacher/admin) within a school. We pull the active rows and
    // aggregate in-process (dataset is small relative to a single school admin).
    const { data: subsData, error: subsError } = await supabase
      .from("user_push_subscriptions")
      .select("user_id, school_id, platform, is_active")
      .eq("is_active", true);

    if (subsError) {
      return jsonError(`تعذر تحميل اشتراكات الأجهزة: ${subsError.message}`, 500);
    }

    const subs = (subsData ?? []) as Array<{
      user_id: string | null;
      school_id: string | null;
      platform: string | null;
    }>;

    const registeredDevices = subs.length;
    const activeUserIds = new Set(
      subs.map((s) => (s.user_id ?? "").trim()).filter(Boolean),
    );
    const activeMobileUsers = activeUserIds.size;

    // Devices by platform
    const byPlatform: Record<string, number> = {};
    for (const s of subs) {
      const p = (s.platform ?? "unknown").trim() || "unknown";
      byPlatform[p] = (byPlatform[p] ?? 0) + 1;
    }

    // Devices by school
    const bySchoolCount: Record<string, number> = {};
    for (const s of subs) {
      const sid = (s.school_id ?? "").trim();
      if (!sid) continue;
      bySchoolCount[sid] = (bySchoolCount[sid] ?? 0) + 1;
    }

    // Resolve school names for the breakdown
    const schoolIds = Object.keys(bySchoolCount);
    const schoolNames: Record<string, string> = {};
    if (schoolIds.length > 0) {
      const { data: schoolsData } = await supabase
        .from("schools")
        .select("id, name")
        .in("id", schoolIds);
      for (const row of (schoolsData ?? []) as Array<{ id: string; name: string | null }>) {
        schoolNames[row.id] = row.name ?? row.id;
      }
    }

    const bySchool = schoolIds
      .map((id) => ({ school_id: id, school_name: schoolNames[id] ?? id, devices: bySchoolCount[id] }))
      .sort((a, b) => b.devices - a.devices);

    // Breakdown by role: classify the active users via students/teachers/users.
    // We count distinct auth-linked accounts that own an active device.
    const userIdList = Array.from(activeUserIds);
    const byRole: Record<string, number> = { student: 0, teacher: 0, staff: 0, unknown: 0 };

    if (userIdList.length > 0) {
      const [studentsRes, teachersRes, usersRes] = await Promise.all([
        supabase.from("students").select("auth_user_id").in("auth_user_id", userIdList),
        supabase.from("teachers").select("auth_user_id").in("auth_user_id", userIdList),
        supabase.from("users").select("id, role").in("id", userIdList),
      ]);

      const studentIds = new Set(
        ((studentsRes.data ?? []) as Array<{ auth_user_id: string | null }>)
          .map((r) => (r.auth_user_id ?? "").trim())
          .filter(Boolean),
      );
      const teacherIds = new Set(
        ((teachersRes.data ?? []) as Array<{ auth_user_id: string | null }>)
          .map((r) => (r.auth_user_id ?? "").trim())
          .filter(Boolean),
      );
      const staffById = new Map<string, string>();
      for (const r of (usersRes.data ?? []) as Array<{ id?: string; role?: string | null }>) {
        const id = (r.id ?? "").trim();
        if (id) staffById.set(id, (r.role ?? "staff").trim() || "staff");
      }

      for (const uid of userIdList) {
        if (studentIds.has(uid)) byRole.student += 1;
        else if (teacherIds.has(uid)) byRole.teacher += 1;
        else if (staffById.has(uid)) byRole.staff += 1;
        else byRole.unknown += 1;
      }
    }

    // Last-login info: teachers expose app_last_login; students/users have none.
    // Tolerate absence gracefully.
    let lastTeacherLogin: string | null = null;
    try {
      const { data: loginData } = await supabase
        .from("teachers")
        .select("app_last_login")
        .not("app_last_login", "is", null)
        .order("app_last_login", { ascending: false })
        .limit(1);
      const row = (loginData ?? [])[0] as { app_last_login: string | null } | undefined;
      lastTeacherLogin = row?.app_last_login ?? null;
    } catch {
      lastTeacherLogin = null;
    }

    return NextResponse.json({
      ok: true,
      overview: {
        active_mobile_users: activeMobileUsers,
        registered_devices: registeredDevices,
        by_role: byRole,
        by_platform: byPlatform,
        by_school: bySchool,
        last_teacher_login: lastTeacherLogin,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير متوقع.";
    return jsonError(`${ENDPOINT}: ${message}`, 500);
  }
}
