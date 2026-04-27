import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveSchoolManagerOverview, type SchoolManagerBranchSummary } from "@/lib/school-manager/overview";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("ar-IQ")} د.ع`;
}

function formatNumber(value: number) {
  return value.toLocaleString("ar-IQ");
}

function findSelectedBranch(branches: SchoolManagerBranchSummary[], branchId: string | null) {
  if (!branchId) {
    return null;
  }

  return branches.find((branch) => branch.branchId === branchId) ?? null;
}

function buildRows(branch: SchoolManagerBranchSummary): Array<[string, string]> {
  return [
    ["إجمالي الرسوم قبل التخفيض", formatCurrency(branch.totalFeesBeforeDiscount)],
    ["إجمالي الرسوم بعد التخفيض", formatCurrency(branch.totalFeesAfterDiscount)],
    ["التخفيض", formatCurrency(branch.totalDiscount)],
    ["المبلغ المتبقي", formatCurrency(branch.totalRemaining)],
    ["المبلغ المدفوع", formatCurrency(branch.totalPaid)],
    ["إجمالي المصروفات", formatCurrency(branch.totalExpenses)],
    ["عدد الطلاب", formatNumber(branch.studentsCount)],
    ["نسبة السداد", `${formatNumber(branch.paidPercentage)}%`],
  ];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlDocument(title: string, rows: Array<[string, string]>, autoPrint = false) {
  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:12px;border:1px solid #d9d9df;font-weight:700;background:#f7f8fb;">${escapeHtml(label)}</td><td style="padding:12px;border:1px solid #d9d9df;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
  <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f2f4f8; padding: 32px; color: #111827; }
        .sheet { max-width: 880px; margin: 0 auto; background: white; border: 1px solid #d9d9df; border-radius: 24px; padding: 32px; }
        h1 { margin: 0 0 12px; font-size: 28px; }
        p { margin: 0 0 24px; color: #4b5563; }
        table { width: 100%; border-collapse: collapse; }
        .footer { margin-top: 20px; color: #6b7280; font-size: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="sheet">
        <h1>${escapeHtml(title)}</h1>
        <p>تم التوليد من صفحة مدير المدرسة على مستوى المدرسة.</p>
        <table>${tableRows}</table>
        <div class="footer">${new Date().toLocaleString("ar-IQ")}</div>
      </div>
      ${autoPrint ? "<script>window.print();</script>" : ""}
    </body>
  </html>`;
}

export async function GET(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["admin"],
      roleDeniedMessage: "تصدير صفحة مدير المدرسة متاح لمدير المدرسة على مستوى المدرسة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  if (context.value.scopeLevel !== "group_admin") {
    return jsonError("هذا التصدير مخصص لمدير المدرسة على مستوى المدرسة فقط.", 403);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "group-export",
    windowMs: 60_000,
    maxHits: 20,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const branchId = req.nextUrl.searchParams.get("branchId");
  const format = req.nextUrl.searchParams.get("format")?.toLowerCase() ?? "excel";

  const { actorSupabase, targetSchoolId } = context.value;
  const [{ data: school, error: schoolError }, overview] = await Promise.all([
    actorSupabase
      .from("schools")
      .select("id, name")
      .eq("id", targetSchoolId)
      .maybeSingle(),
    resolveSchoolManagerOverview(actorSupabase, targetSchoolId),
  ]);

  if (schoolError || !school?.id) {
    return jsonError("تعذر تحميل بيانات المدرسة الحالية.", 400);
  }

  const selectedBranch = findSelectedBranch(overview.branches, branchId);
  if (branchId && !selectedBranch) {
    return jsonError("الفرع المطلوب غير موجود ضمن هذه المدرسة.", 404);
  }

  const target = selectedBranch
    ? {
        title: `${school.name} - ${selectedBranch.branchName}`,
        rows: buildRows(selectedBranch),
      }
    : {
        title: `${school.name} - إجمالي المدرسة`,
        rows: buildRows({
          branchId: null,
          branchName: "إجمالي المدرسة",
          ...overview.totals,
        }),
      };

  if (format === "excel") {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "School Iraq";
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet("ملخص", {
      views: [{ rightToLeft: true }],
    });

    summarySheet.columns = [
      { header: "البند", key: "label", width: 34 },
      { header: "القيمة", key: "value", width: 28 },
    ];

    summarySheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2446E8" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { horizontal: "center" };
    });

    target.rows.forEach(([label, value]) => {
      summarySheet.addRow({ label, value });
    });

    if (!selectedBranch) {
      const branchesSheet = workbook.addWorksheet("الفروع", {
        views: [{ rightToLeft: true }],
      });
      branchesSheet.columns = [
        { header: "الفرع", key: "branch", width: 24 },
        { header: "قبل التخفيض", key: "before", width: 20 },
        { header: "بعد التخفيض", key: "after", width: 20 },
        { header: "المدفوع", key: "paid", width: 20 },
        { header: "المتبقي", key: "remaining", width: 20 },
        { header: "المصروفات", key: "expenses", width: 20 },
        { header: "الطلاب", key: "students", width: 14 },
        { header: "نسبة السداد", key: "rate", width: 16 },
      ];

      branchesSheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { horizontal: "center" };
      });

      overview.branches.forEach((branch) => {
        branchesSheet.addRow({
          branch: branch.branchName,
          before: formatCurrency(branch.totalFeesBeforeDiscount),
          after: formatCurrency(branch.totalFeesAfterDiscount),
          paid: formatCurrency(branch.totalPaid),
          remaining: formatCurrency(branch.totalRemaining),
          expenses: formatCurrency(branch.totalExpenses),
          students: formatNumber(branch.studentsCount),
          rate: `${formatNumber(branch.paidPercentage)}%`,
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"school-manager-${Date.now()}.xlsx\"`,
      },
    });
  }

  const html = buildHtmlDocument(target.title, target.rows, format === "pdf");
  return new NextResponse(html, {
    headers: {
      "Content-Type":
        format === "word"
          ? "application/msword; charset=utf-8"
          : "text/html; charset=utf-8",
      "Content-Disposition":
        format === "word"
          ? `attachment; filename="school-manager-${Date.now()}.doc"`
          : "inline",
    },
  });
}
