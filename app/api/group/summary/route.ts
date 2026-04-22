import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { jsonError } from "@/lib/route-utils";
import { resolveSchoolManagerOverview } from "@/lib/school-manager/overview";

async function resolveAuthorizedSchool(req: NextRequest, requestedGroupId: string | null) {
  if (!requestedGroupId) {
    return { ok: false as const, status: 400, message: "groupId مطلوب" };
  }

  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["admin"],
      roleDeniedMessage: "هذه الواجهة مخصصة لمدير المدرسة على مستوى المدرسة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return {
      ok: false as const,
      status: "status" in context ? context.status : 500,
      message: "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
    };
  }

  if (context.value.scopeLevel !== "group_admin") {
    return { ok: false as const, status: 403, message: "لا تملك صلاحية عرض ملخص المجموعة." };
  }

  const { data: school, error } = await context.value.actorSupabase
    .from("schools")
    .select("id, name, group_id")
    .eq("id", context.value.targetSchoolId)
    .maybeSingle();

  if (error || !school?.id || !school.group_id) {
    return { ok: false as const, status: 404, message: "المجموعة الحالية غير متاحة لهذا المستخدم." };
  }

  if (school.group_id !== requestedGroupId) {
    return { ok: false as const, status: 403, message: "لا يمكنك الوصول إلى مجموعة أخرى." };
  }

  return {
    ok: true as const,
    actorSupabase: context.value.actorSupabase,
    schoolId: school.id,
    schoolName: school.name ?? "المدرسة الحالية",
  };
}

export async function GET(req: NextRequest) {
  const auth = await resolveAuthorizedSchool(req, req.nextUrl.searchParams.get("groupId"));
  if (!auth.ok) {
    return jsonError(auth.message, auth.status);
  }

  const overview = await resolveSchoolManagerOverview(auth.actorSupabase, auth.schoolId);
  const branches = overview.branches.map((branch) => ({
    id: branch.branchId,
    name: branch.branchName,
    students: branch.studentsCount,
    collected: branch.totalPaid,
    expenses: branch.totalExpenses,
    net: branch.totalPaid - branch.totalExpenses,
  }));

  return NextResponse.json({
    ok: true,
    group: {
      id: auth.schoolId,
      name: auth.schoolName,
      logo_url: null,
    },
    branches,
    totals: {
      students: overview.totals.studentsCount,
      collected: overview.totals.totalPaid,
      expenses: overview.totals.totalExpenses,
      net: overview.totals.totalPaid - overview.totals.totalExpenses,
    },
  });
}

