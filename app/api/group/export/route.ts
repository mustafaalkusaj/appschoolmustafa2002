import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { jsonError } from "@/lib/route-utils";

function getService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function fmtIQD(n: number) {
  return n.toLocaleString("ar-IQ") + " د.ع";
}

export async function GET(req: NextRequest) {
  const service = getService();
  const groupId = req.nextUrl.searchParams.get("groupId");
  const format = req.nextUrl.searchParams.get("format") ?? "excel";
  if (!groupId) return jsonError("groupId مطلوب", 400);

  const { data: group } = await service.from("school_groups").select("id,name").eq("id", groupId).single();
  if (!group) return jsonError("المجموعة غير موجودة", 404);

  const { data: branches } = await service.from("branches").select("id,name").eq("group_id", groupId).eq("is_active", true);

  const branchStats = await Promise.all(
    (branches ?? []).map(async (branch) => {
      const [studentsRes, paymentsRes, expensesRes, feesRes] = await Promise.all([
        service.from("students").select("id", { count: "exact", head: true }).eq("branch_id", branch.id).neq("status", "deleted"),
        service.from("payments").select("amount").eq("branch_id", branch.id),
        service.from("expenses").select("amount").eq("branch_id", branch.id),
        service.from("students").select("total_fee").eq("branch_id", branch.id).neq("status", "deleted"),
      ]);
      const collected = (paymentsRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const expenses = (expensesRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const expected = (feesRes.data ?? []).reduce((s, r) => s + Number(r.total_fee ?? 0), 0);
      const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
      return { id: branch.id, name: branch.name, students: studentsRes.count ?? 0, collected, expenses, net: collected - expenses, collectionRate };
    })
  );

  const totals = branchStats.reduce(
    (acc, b) => ({ students: acc.students + b.students, collected: acc.collected + b.collected, expenses: acc.expenses + b.expenses, net: acc.net + b.net }),
    { students: 0, collected: 0, expenses: 0, net: 0 }
  );

  if (format === "excel") {
    const wb = new ExcelJS.Workbook();
    wb.creator = "منظومة المدارس";
    wb.created = new Date();

    // Summary sheet
    const ws = wb.addWorksheet("ملخص المجموعة", { views: [{ rightToLeft: true }] });
    ws.columns = [
      { header: "الفرع", key: "name", width: 25 },
      { header: "الطلاب", key: "students", width: 12 },
      { header: "الإيرادات", key: "collected", width: 20 },
      { header: "المصاريف", key: "expenses", width: 20 },
      { header: "الصافي", key: "net", width: 20 },
      { header: "نسبة التحصيل", key: "collectionRate", width: 18 },
    ];

    // Purple header
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { horizontal: "center" };
    });

    branchStats.forEach((b) => {
      ws.addRow({ name: b.name, students: b.students, collected: fmtIQD(b.collected), expenses: fmtIQD(b.expenses), net: fmtIQD(b.net), collectionRate: `${b.collectionRate}%` });
    });

    // Totals row
    const totalRow = ws.addRow({ name: "المجموع الكلي", students: totals.students, collected: fmtIQD(totals.collected), expenses: fmtIQD(totals.expenses), net: fmtIQD(totals.net), collectionRate: "" });
    totalRow.font = { bold: true };
    totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } };

    // Per-branch sheets
    for (const b of branchStats) {
      const bs = wb.addWorksheet(b.name, { views: [{ rightToLeft: true }] });
      bs.addRow(["الفرع", b.name]);
      bs.addRow(["الطلاب", b.students]);
      bs.addRow(["الإيرادات", fmtIQD(b.collected)]);
      bs.addRow(["المصاريف", fmtIQD(b.expenses)]);
      bs.addRow(["الصافي", fmtIQD(b.net)]);
      bs.addRow(["نسبة التحصيل", `${b.collectionRate}%`]);
    }

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="group-report-${Date.now()}.xlsx"`,
      },
    });
  }

  // PDF format — simple HTML-based table response that can be printed
  const rows = branchStats.map((b) => `<tr><td>${b.name}</td><td>${b.students}</td><td>${fmtIQD(b.collected)}</td><td>${fmtIQD(b.expenses)}</td><td>${fmtIQD(b.net)}</td><td>${b.collectionRate}%</td></tr>`).join("");
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تقرير ${group.name}</title>
  <style>body{font-family:Arial,sans-serif;direction:rtl}table{width:100%;border-collapse:collapse}th{background:#7C3AED;color:#fff;padding:8px}td{border:1px solid #ccc;padding:8px}tfoot td{font-weight:bold;background:#EDE9FE}</style></head>
  <body><h1>${group.name}</h1><p>تاريخ التصدير: ${new Date().toLocaleDateString("ar-IQ")}</p>
  <table><thead><tr><th>الفرع</th><th>الطلاب</th><th>الإيرادات</th><th>المصاريف</th><th>الصافي</th><th>نسبة التحصيل</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td>المجموع</td><td>${totals.students}</td><td>${fmtIQD(totals.collected)}</td><td>${fmtIQD(totals.expenses)}</td><td>${fmtIQD(totals.net)}</td><td></td></tr></tfoot>
  </table></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
