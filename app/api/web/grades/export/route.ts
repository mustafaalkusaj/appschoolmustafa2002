import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { fetchGradeEntriesForSection } from "@/lib/grades/grade-entries-server";
import { computeGradeLabel, computePercentage } from "@/lib/grades/grade-calculator";
import { buildStyledWorkbook } from "@/lib/excel-builder";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "تصدير الدرجات متاح ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من الصلاحيات.",
      "status" in context ? context.status : 500,
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "grades-export",
    windowMs: 60_000,
    maxHits: 10,
    identifier: context.value.actorUserId,
  });

  if (rateLimited) {
    return jsonError("تجاوزت الحد الأقصى لتصدير الدرجات. حاول مجدداً بعد دقيقة.", 429);
  }

  const hasPermission = await routeUserHasPermission(
    context.value.actorSupabase,
    context.value.actorUserId,
    "export_grades",
  );

  if (!hasPermission) {
    return jsonError("ليس لديك صلاحية تصدير الدرجات.", 403);
  }

  const classId = searchParams.get("classId") ?? undefined;
  const sectionId = searchParams.get("sectionId") ?? undefined;
  const subjectId = searchParams.get("subjectId") ?? undefined;
  const academicYear = searchParams.get("academicYear") ?? "";
  const semesterRaw = searchParams.get("semester");
  const semester = semesterRaw === "2" ? (2 as const) : (1 as const);

  if (!academicYear) {
    return jsonError("السنة الدراسية مطلوبة.", 400);
  }

  const { actorSupabase: serviceSupabase, targetSchoolId: resolvedSchoolId } = context.value;

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  let branchStudentIds: string[] | undefined;
  if (branchScope.value.branchIds.length > 0) {
    const { data: bs } = await applyBranchScopeToQuery(
      serviceSupabase.from("students").select("id").eq("school_id", resolvedSchoolId),
      branchScope.value,
    );
    branchStudentIds = ((bs ?? []) as Array<{ id: string }>).map((s) => s.id);
  }

  const [entriesResult] = await Promise.all([
    fetchGradeEntriesForSection(serviceSupabase, resolvedSchoolId, {
      classId,
      sectionId,
      subjectId,
      academicYear,
      semester,
      studentIds: branchStudentIds,
    }),
  ]);

  if (!entriesResult.ok) {
    return jsonError(entriesResult.gate.message ?? "تعذر تحميل الدرجات.", 503);
  }

  const entries = entriesResult.items;

  const rows = entries.map((entry) => {
    const pct = computePercentage(entry.score, entry.max_score);
    const gradeLabel = computeGradeLabel(pct);

    return {
      student_name: entry.student_name ?? "",
      class_name: entry.class_name ?? "",
      section_name: entry.section_name ?? "",
      subject_name: entry.subject_name ?? "",
      grade_type: entry.grade_type_name ?? "",
      score: entry.score,
      max_score: entry.max_score,
      percentage: pct,
      grade_label: gradeLabel.labelAr,
      status: entry.status,
    };
  });

  const buffer = await buildStyledWorkbook({
    themeId: "navy",
    sheets: [
      {
        name: "الدرجات",
        title: `كشف الدرجات — ${academicYear} — الفصل ${semester}`,
        subtitle: entries[0]?.class_name
          ? `${entries[0].class_name}${entries[0].section_name ? ` / ${entries[0].section_name}` : ""}`
          : undefined,
        columns: [
          { header: "اسم الطالب", key: "student_name", width: 30 },
          { header: "الصف", key: "class_name", width: 16 },
          { header: "الشعبة", key: "section_name", width: 12 },
          { header: "المادة", key: "subject_name", width: 18 },
          { header: "نوع الدرجة", key: "grade_type", width: 16 },
          { header: "الدرجة", key: "score", width: 10, numFmt: "#,##0.#" },
          { header: "من", key: "max_score", width: 8, numFmt: "#,##0.#" },
          { header: "النسبة %", key: "percentage", width: 10, numFmt: "#,##0.0" },
          { header: "التقدير", key: "grade_label", width: 14 },
          { header: "الحالة", key: "status", width: 12 },
        ],
        rows,
      },
    ],
  });

  const filename = encodeURIComponent(`grades_${academicYear}_s${semester}.xlsx`);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
