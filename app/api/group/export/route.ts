import { NextRequest, NextResponse } from "next/server";
import { buildStyledWorkbook } from "@/lib/excel-builder";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { jsonError } from "@/lib/route-utils";
import { resolveSchoolManagerOverview } from "@/lib/school-manager/overview";

function fmtIQD(value: number) {
  return `${value.toLocaleString("ar-IQ-u-nu-latn")} د.ع`;
}

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
    return { ok: false as const, status: 403, message: "لا تملك صلاحية تصدير هذه المجموعة." };
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
    return { ok: false as const, status: 403, message: "لا يمكنك تصدير مجموعة أخرى." };
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

  const format = req.nextUrl.searchParams.get("format")?.toLowerCase() ?? "excel";
  const overview = await resolveSchoolManagerOverview(auth.actorSupabase, auth.schoolId);
  const branchStats = overview.branches.map((branch) => {
    const expected = branch.totalFeesAfterDiscount;
    const collected = branch.totalPaid;
    const expenses = branch.totalExpenses;
    const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

    return {
      id: branch.branchId,
      name: branch.branchName,
      students: branch.studentsCount,
      collected,
      expenses,
      net: collected - expenses,
      collectionRate,
    };
  });

  if (format === "excel") {
    const buf = await buildStyledWorkbook({
      sheets: [{
        name:  "ملخص المدرسة",
        title: "ملخص المدرسة",
        columns: [
          { header: "الفرع",          key: "name",          width: 25 },
          { header: "الطلاب",         key: "students",      width: 12 },
          { header: "الإيرادات",      key: "collected",     width: 20, numFmt: "#,##0", fixedColor: "green" },
          { header: "المصاريف",       key: "expenses",      width: 20, numFmt: "#,##0", fixedColor: "red" },
          { header: "الصافي",         key: "net",           width: 20, numFmt: "#,##0" },
          { header: "نسبة التحصيل",   key: "collectionRate",width: 18 },
        ],
        rows: branchStats.map((branch) => ({
          name:           branch.name,
          students:       branch.students,
          collected:      branch.collected,
          expenses:       branch.expenses,
          net:            branch.net,
          collectionRate: `${branch.collectionRate}%`,
        })),
        totals: {
          name:      "المجموع الكلي",
          students:  overview.totals.studentsCount,
          collected: overview.totals.totalPaid,
          expenses:  overview.totals.totalExpenses,
          net:       overview.totals.totalPaid - overview.totals.totalExpenses,
        },
        totalsLabel: "المجموع الكلي",
      }],
    });
    const filename = `ملخص_المدرسة_${Date.now()}.xlsx`;
    return new NextResponse(buf as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  }

  const rows = branchStats
    .map(
      (branch) =>
        `<tr><td>${branch.name}</td><td>${branch.students}</td><td>${fmtIQD(branch.collected)}</td><td>${fmtIQD(branch.expenses)}</td><td>${fmtIQD(branch.net)}</td><td>${branch.collectionRate}%</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تقرير ${auth.schoolName}</title>
  <style>body{font-family:Arial,sans-serif;direction:rtl}table{width:100%;border-collapse:collapse}th{background:#7C3AED;color:#fff;padding:8px}td{border:1px solid #ccc;padding:8px}tfoot td{font-weight:bold;background:#EDE9FE}</style></head>
  <body><h1>${auth.schoolName}</h1><p>تاريخ التصدير: ${new Date().toLocaleDateString("ar-IQ-u-nu-latn")}</p>
  <table><thead><tr><th>الفرع</th><th>الطلاب</th><th>الإيرادات</th><th>المصاريف</th><th>الصافي</th><th>نسبة التحصيل</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td>المجموع</td><td>${overview.totals.studentsCount}</td><td>${fmtIQD(overview.totals.totalPaid)}</td><td>${fmtIQD(overview.totals.totalExpenses)}</td><td>${fmtIQD(overview.totals.totalPaid - overview.totals.totalExpenses)}</td><td></td></tr></tfoot>
  </table></body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

