import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";

import { resolveBranchScope } from "@/lib/branch-scope";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { exportPaymentStudents, parsePaymentsListFilters, type PaymentStudentRecord } from "@/lib/payments/overview";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// ARGB helpers
const C = {
  headerBg:    "FF1B3A6B", // أزرق داكن
  headerBg2:   "FF2D5FA0", // أزرق متوسط (صف التاريخ)
  colHeaderBg: "FF2563EB", // أزرق رؤوس الأعمدة
  white:       "FFFFFFFF",
  rowEven:     "FFF1F5F9", // رمادي فاتح
  rowOdd:      "FFFFFFFF",
  paidColor:   "FF16A34A", // أخضر (المدفوع)
  discColor:   "FFD97706", // برتقالي (التخفيض)
  remZeroBg:   "FFDCFCE7", // خضراء (متبقي = 0)
  remZeroFg:   "FF16A34A",
  remPosBg:    "FFFEE2E2", // حمراء (متبقي > 0)
  remPosFg:    "FFDC2626",
  totalBg:     "FF1B3A6B",
};

function thinBorder(): Partial<ExcelJS.Borders> {
  const s: ExcelJS.BorderStyle = "thin";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = { argb: "FFD1D5DB" } as any;
  return { top: { style: s, color: c }, bottom: { style: s, color: c }, left: { style: s, color: c }, right: { style: s, color: c } };
}

function numFmt(v: number): number { return v; }

async function buildExcelBuffer(students: PaymentStudentRecord[], schoolName: string): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "School Iraq";
  wb.created = new Date();

  const ws = wb.addWorksheet("فواتير أقساط الطلاب", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddFooter: `&C&8تم التصدير من نظام إدارة المدرسة — ${new Date().toLocaleDateString("ar-IQ")}`,
    },
  });

  // Column definitions
  ws.columns = [
    { key: "name",      width: 32 },
    { key: "class",     width: 20 },
    { key: "section",   width: 12 },
    { key: "total",     width: 18 },
    { key: "paid",      width: 18 },
    { key: "discount",  width: 15 },
    { key: "remaining", width: 18 },
  ];

  const COLS = 7;
  const exportDate = new Date().toLocaleDateString("ar-IQ");

  // Row 1 — عنوان رئيسي
  const titleRow = ws.addRow(["فواتير أقساط الطلاب", "", "", "", "", "", ""]);
  ws.mergeCells(1, 1, 1, COLS);
  titleRow.height = 36;
  titleRow.getCell(1).value = "فواتير أقساط الطلاب";
  titleRow.getCell(1).fill   = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } };
  titleRow.getCell(1).font   = { color: { argb: C.white }, bold: true, size: 16, name: "Arial" };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };

  // Row 2 — اسم المدرسة
  const schoolRow = ws.addRow([schoolName, "", "", "", "", "", ""]);
  ws.mergeCells(2, 1, 2, COLS);
  schoolRow.height = 22;
  schoolRow.getCell(1).value = schoolName;
  schoolRow.getCell(1).fill   = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } };
  schoolRow.getCell(1).font   = { color: { argb: C.white }, bold: false, size: 11, name: "Arial" };
  schoolRow.getCell(1).alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };

  // Row 3 — تاريخ التصدير
  const dateRow = ws.addRow([`تاريخ التصدير: ${exportDate}`, "", "", "", "", "", ""]);
  ws.mergeCells(3, 1, 3, COLS);
  dateRow.height = 22;
  dateRow.getCell(1).value = `تاريخ التصدير: ${exportDate}`;
  dateRow.getCell(1).fill   = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg2 } };
  dateRow.getCell(1).font   = { color: { argb: C.white }, size: 11, name: "Arial" };
  dateRow.getCell(1).alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };

  // Row 4 — رؤوس الأعمدة
  const headers = ["اسم الطالب", "الصف", "الشعبة", "المبلغ الكلي", "المبلغ المدفوع", "التخفيض", "المبلغ المتبقي"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: C.colHeaderBg } };
    cell.font      = { color: { argb: C.white }, bold: true, size: 11, name: "Arial" };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl", wrapText: true };
    cell.border    = thinBorder();
  });

  // AutoFilter on header row (row 4)
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: COLS } };

  // Data rows
  let totalFee = 0, totalPaid = 0, totalDiscount = 0, totalRemaining = 0;

  students.forEach((s, idx) => {
    const isEven = idx % 2 === 1;
    const remaining = s.remaining_fee ?? 0;
    const row = ws.addRow({
      name:      s.full_name,
      class:     s.class_name ?? "",
      section:   s.section ?? "",
      total:     numFmt(s.total_fee ?? 0),
      paid:      numFmt(s.paid_fee ?? 0),
      discount:  numFmt(s.discount_value ?? 0),
      remaining: numFmt(remaining),
    });
    row.height = 22;

    const rowBg = isEven ? C.rowEven : C.rowOdd;

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.alignment = { vertical: "middle", readingOrder: "rtl", horizontal: colNum === 1 ? "right" : "center" };
      cell.border = thinBorder();
      cell.font = { name: "Arial", size: 10 };

      if (colNum <= 3) {
        // Text columns — row background
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      } else if (colNum === 5) {
        // المدفوع — أخضر
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.font = { name: "Arial", size: 10, color: { argb: C.paidColor }, bold: true };
        cell.numFmt = "#,##0";
      } else if (colNum === 6) {
        // التخفيض — برتقالي
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.font = { name: "Arial", size: 10, color: { argb: C.discColor } };
        cell.numFmt = "#,##0";
      } else if (colNum === 7) {
        // المتبقي — أحمر/أخضر حسب القيمة
        if (remaining <= 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.remZeroBg } };
          cell.font = { name: "Arial", size: 10, color: { argb: C.remZeroFg }, bold: true };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.remPosBg } };
          cell.font = { name: "Arial", size: 10, color: { argb: C.remPosFg }, bold: true };
        }
        cell.numFmt = "#,##0";
      } else {
        // المبلغ الكلي
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.numFmt = "#,##0";
      }
    });

    totalFee       += s.total_fee ?? 0;
    totalPaid      += s.paid_fee ?? 0;
    totalDiscount  += s.discount_value ?? 0;
    totalRemaining += remaining;
  });

  // Totals row
  const totalRow = ws.addRow({
    name:      `المجموع (${students.length} طالب)`,
    class:     "",
    section:   "",
    total:     numFmt(totalFee),
    paid:      numFmt(totalPaid),
    discount:  numFmt(totalDiscount),
    remaining: numFmt(totalRemaining),
  });
  totalRow.height = 26;
  totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: C.totalBg } };
    cell.font      = { color: { argb: C.white }, bold: true, size: 11, name: "Arial" };
    cell.alignment = { horizontal: colNum === 1 ? "right" : "center", vertical: "middle", readingOrder: "rtl" };
    cell.border    = thinBorder();
    if (colNum >= 4) cell.numFmt = "#,##0";
  });

  return wb.xlsx.writeBuffer();
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
      const buffer = await buildExcelBuffer(students, schoolName);
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
