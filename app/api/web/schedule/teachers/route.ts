import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";

/**
 * GET /api/web/schedule/teachers?schoolId=...
 *
 * Returns a list of distinct teacher names for the school's schedule.
 */
export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "ليس لديك صلاحية عرض الجدول.",
    },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "schedule-teachers-read",
    windowMs: 60_000,
    maxHits: 60,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  // Get distinct teacher names from the user_profiles table for this school
  const { data, error } = await actorSupabase
    .from("user_profiles")
    .select("full_name")
    .eq("school_id", targetSchoolId)
    .eq("role", "teacher")
    .order("full_name", { ascending: true });

  if (error) return jsonError(error.message || "تعذر تحميل قائمة المعلمين.", 500);

  const teachers = (data ?? [])
    .map((row: Record<string, unknown>) => row.full_name as string)
    .filter(Boolean);

  return NextResponse.json({ ok: true, teachers });
}
