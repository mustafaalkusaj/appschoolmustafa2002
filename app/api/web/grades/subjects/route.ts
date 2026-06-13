import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "عرض المواد الدراسية متاح ضمن نطاق المدرسة الحالية فقط.",
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

  const [rateLimited, canView] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "grades-subjects-read",
      windowMs: 60_000,
      maxHits: 120,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "view_grades"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canView) return jsonError("ليس لديك صلاحية عرض المواد الدراسية.", 403);

  try {
    // Try school-scoped subjects table first
    const { data, error } = await actorSupabase
      .from("subjects")
      .select("id, name")
      .eq("school_id", targetSchoolId)
      .order("name", { ascending: true });

    if (error) {
      // If school_id column doesn't exist, try without it
      const { data: fallbackData, error: fallbackError } = await actorSupabase
        .from("subjects")
        .select("id, name")
        .order("name", { ascending: true });

      if (fallbackError) {
        return jsonError("تعذر تحميل المواد الدراسية.", 500);
      }

      return NextResponse.json({ ok: true, subjects: fallbackData ?? [] });
    }

    return NextResponse.json({ ok: true, subjects: data ?? [] });
  } catch {
    return jsonError("تعذر تحميل المواد الدراسية.", 500);
  }
}
