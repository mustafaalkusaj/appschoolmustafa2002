import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { jsonError } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "عرض هيكل الصفوف متاح ضمن نطاق المدرسة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;

  try {
    const [classesRes, sectionsRes] = await Promise.all([
      actorSupabase
        .from("classes")
        .select("id, name")
        .eq("school_id", targetSchoolId)
        .order("name"),
      actorSupabase
        .from("sections")
        .select("id, name, class_id")
        .eq("school_id", targetSchoolId)
        .order("name"),
    ]);

    return NextResponse.json({
      classes: classesRes.data ?? [],
      sections: sectionsRes.data ?? [],
    });
  } catch {
    return jsonError("تعذر تحميل هيكل الصفوف.", 500);
  }
}
