import { NextRequest, NextResponse } from "next/server";
import { buildStyledWorkbook } from "@/lib/excel-builder";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { resolveSchoolManagerOverview, type SchoolManagerBranchSummary } from "@/lib/school-manager/overview";
import { escapeHtml, buildCsvContent } from "@/lib/export";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function enforceRateLimit(key: string, limit: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || record.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

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

function buildHtmlDocument(title: string, rows: Array<[string, string]>, autoPrint = false) {
  const escapedTitle = escapeHtml(title);
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
      <title>${escapedTitle}</title>
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
        <h1>${escapedTitle}</h1>
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

  const userId = context.value.targetSchoolId;
  if (!enforceRateLimit(userId, 20, 60000)) {
    return jsonError("عدد طلبات التصدير كثير جداً. انتظر قليلاً قبل المحاولة مجدداً.", 429);
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
        } as SchoolManagerBranchSummary),
      };

  if (format === "csv") {
    const csvRows = target.rows.map(([label, value]) => ({ label, value }));
    const csv = buildCsvContent(csvRows, ["label", "value"]);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="school-manager-${Date.now()}.csv"`,
      },
    });
  }

  if (format === "excel") {
    const sheets = [
      {
        name:  "ملخص",
        title: target.title,
        columns: [
          { header: "البند",   key: "label", width: 34 },
          { header: "القيمة", key: "value", width: 28 },
        ],
        rows: target.rows.map(([label, value]) => ({ label, value })),
      },
      ...(!selectedBranch ? [{
        name:  "الفروع",
        title: "الفروع",
        columns: [
          { header: "الفرع",         key: "branch",    width: 24 },
          { header: "قبل التخفيض",  key: "before",    width: 20, numFmt: "#,##0" },
          { header: "بعد التخفيض",  key: "after",     width: 20, numFmt: "#,##0" },
          { header: "المدفوع",      key: "paid",      width: 20, numFmt: "#,##0", fixedColor: "green" as const },
          { header: "المتبقي",      key: "remaining", width: 20, numFmt: "#,##0", semanticColor: "remaining" as const },
          { header: "المصروفات",    key: "expenses",  width: 20, numFmt: "#,##0", fixedColor: "red" as const },
          { header: "الطلاب",       key: "students",  width: 14 },
          { header: "نسبة السداد",  key: "rate",      width: 16 },
        ],
        rows: overview.branches.map((branch) => ({
          branch:    branch.branchName,
          before:    branch.totalFeesBeforeDiscount,
          after:     branch.totalFeesAfterDiscount,
          paid:      branch.totalPaid,
          remaining: branch.totalRemaining,
          expenses:  branch.totalExpenses,
          students:  branch.studentsCount,
          rate:      `${branch.paidPercentage}%`,
        })),
      }] : []),
    ];

    const buffer = await buildStyledWorkbook({ sheets });
    const filename = `ملخص_المدرسة_${Date.now()}.xlsx`;
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
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
