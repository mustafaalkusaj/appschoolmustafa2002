import { NextRequest, NextResponse } from "next/server";

import { resolveBranchScope } from "@/lib/branch-scope";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { exportPaymentStudents, parsePaymentsListFilters, type PaymentStudentRecord } from "@/lib/payments/overview";
import { buildStyledWorkbook } from "@/lib/excel-builder";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

async function buildPaymentsExcel(students: PaymentStudentRecord[], schoolName: string): Promise<ArrayBuffer> {
  return buildStyledWorkbook({
    sheets: [{
      name:     "فواتير أقساط الطلاب",
      title:    "فواتير أقساط الطلاب",
      subtitle: schoolName,
      columns: [
        { header: "اسم الطالب",    key: "name",      width: 32 },
        { header: "الصف",          key: "class",     width: 20 },
        { header: "الشعبة",        key: "section",   width: 12 },
        { header: "المبلغ الكلي",  key: "total",     width: 18, numFmt: "#,##0" },
        { header: "المبلغ المدفوع",key: "paid",      width: 18, numFmt: "#,##0", semanticColor: "paid" },
        { header: "التخفيض",       key: "discount",  width: 15, numFmt: "#,##0", semanticColor: "discount" },
        { header: "المبلغ المتبقي",key: "remaining", width: 18, numFmt: "#,##0", semanticColor: "remaining" },
      ],
      rows: students.map((s) => ({
        name:      s.full_name,
        class:     s.class_name ?? "",
        section:   s.section ?? "",
        total:     s.total_fee ?? 0,
        paid:      s.paid_fee ?? 0,
        discount:  s.discount_value ?? 0,
        remaining: s.remaining_fee ?? 0,
      })),
      totalsLabel: `المجموع (${students.length} طالب)`,
    }],
  });
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "تصدير المدفوعات متاح ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "payments-export",
    windowMs: 60_000,
    maxHits: 15,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const format = req.nextUrl.searchParams.get("format")?.toLowerCase();

  try {
    const { search, className, quickFilter, sort, dir } = parsePaymentsListFilters(req.nextUrl.searchParams);
    const students = await exportPaymentStudents(actorSupabase, targetSchoolId, branchScope.value, {
      search,
      className,
      quickFilter,
      sort,
      dir,
    });

    if (format === "excel") {
      // Fetch school name for the header
      const { data: school } = await actorSupabase
        .from("schools")
        .select("name")
        .eq("id", targetSchoolId)
        .maybeSingle();

      const schoolName = school?.name ?? "المدرسة";
      const buffer = await buildPaymentsExcel(students, schoolName);
      const dateStr = new Date().toLocaleDateString("ar-IQ").replace(/\//g, "_");
      const filename = `فواتير_اقساط_الطلاب_${dateStr}.xlsx`;

      return new NextResponse(buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      students,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل بيانات التصدير.", 500);
  }
}
