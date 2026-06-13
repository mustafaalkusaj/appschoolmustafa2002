import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { jsonError } from "@/lib/route-utils";

// GET /api/web/branch/list?schoolId=X
// Returns list of branches for the school
export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح بالوصول." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من الصلاحيات.",
      "status" in context ? context.status : 500,
    );
  }

  const { targetSchoolId, actorSupabase } = context.value;

  const { data, error } = await actorSupabase
    .from("branches")
    .select("id, name")
    .eq("school_id", targetSchoolId)
    .order("name");

  if (error) {
    return jsonError("تعذر تحميل قائمة الفروع.", 500);
  }

  return NextResponse.json({
    ok: true,
    branches: (data ?? []) as Array<{ id: string; name: string }>,
  });
}
