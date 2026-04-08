"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate, formatNumber } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { loadXLSX } from "@/lib/xlsx-loader";
import { resolveSchoolIdForProfile } from "@/lib/school-context";

type StudentRow = {
  id: string;
  full_name: string;
  class_name: string | null;
  total_fee: number | null;
  paid_fee: number | null;
  remaining_fee: number | null;
  status: string | null;
  phone: string | null;
  address: string | null;
};

type PaymentRow = {
  id: string;
  amount: number | null;
  created_at: string | null;
  payment_method: string | null;
  receipt_number: string | null;
  notes: string | null;
  students?: { full_name: string | null; class_name: string | null } | null;
};

type ExpenseRow = {
  id: string;
  amount: number | null;
  expense_date: string | null;
  recipient: string | null;
  receipt_number: string | null;
  notes: string | null;
  expense_types?: { name: string | null } | null;
};

function formatNullableDate(value: string | null | undefined) {
  return value ? formatDate(value) : "—";
}

function paymentMethodLabel(method: string | null | undefined) {
  return (
    {
      cash: "نقداً",
      bank_transfer: "تحويل بنكي",
      check: "شيك",
    } as Record<string, string>
  )[method || ""] || method || "—";
}

function studentStatusLabel(status: string | null | undefined) {
  return (
    {
      active: "نشط",
      transferred: "منقول",
      suspended: "موقوف",
      graduated: "متخرج",
      withdrawn: "منسحب",
      archived: "مؤرشف",
      deleted: "محذوف",
    } as Record<string, string>
  )[status || ""] || status || "—";
}

export default function ReportsPage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    const schoolId = await resolveSchoolIdForProfile(profile, {
      selectedSchoolId: schoolScope.selectedSchoolId,
    });

    if (!schoolId) {
      setStudents([]);
      setPayments([]);
      setExpenses([]);
      setLoading(false);
      return;
    }

    const [studentsResult, paymentsResult, expensesResult] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, class_name, total_fee, paid_fee, remaining_fee, status, phone, address")
        .eq("school_id", schoolId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("id, amount, created_at, payment_method, receipt_number, notes, students(full_name,class_name)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("id, amount, expense_date, recipient, receipt_number, notes, expense_types(name)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
    ]);

    const normalizedPayments = ((paymentsResult.data || []) as Array<
      PaymentRow & { students?: PaymentRow["students"] | PaymentRow["students"][] }
    >).map((item) => ({
      ...item,
      students: Array.isArray(item.students) ? item.students[0] ?? null : item.students ?? null,
    }));
    const normalizedExpenses = ((expensesResult.data || []) as Array<
      ExpenseRow & { expense_types?: ExpenseRow["expense_types"] | ExpenseRow["expense_types"][] }
    >).map((item) => ({
      ...item,
      expense_types: Array.isArray(item.expense_types) ? item.expense_types[0] ?? null : item.expense_types ?? null,
    }));

    setStudents((studentsResult.data || []) as StudentRow[]);
    setPayments(normalizedPayments as PaymentRow[]);
    setExpenses(normalizedExpenses as ExpenseRow[]);
    setLoading(false);
  }, [profile, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchAll();
  }, [fetchAll, profile, schoolScope.scopeLoading]);

  const metrics = useMemo(() => {
    const totalFees = students.reduce((sum, item) => sum + (item.total_fee || 0), 0);
    const totalPaid = students.reduce((sum, item) => sum + (item.paid_fee || 0), 0);
    const totalRemaining = students.reduce((sum, item) => sum + (item.remaining_fee || 0), 0);
    const paymentVolume = payments.reduce((sum, item) => sum + (item.amount || 0), 0);
    const expenseVolume = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const activeStudents = students.filter((item) => item.status === "active").length;

    return {
      totalFees,
      totalPaid,
      totalRemaining,
      paymentVolume,
      expenseVolume,
      activeStudents,
      netBalance: paymentVolume - expenseVolume,
    };
  }, [students, payments, expenses]);

  async function exportRows(rows: Record<string, unknown>[], sheetName: string, fileName: string) {
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}_${formatDate(new Date())}.xlsx`);
  }

  async function exportStudentsExcel() {
    await exportRows(
      students.map((item) => ({
        الاسم: item.full_name,
        الصف: item.class_name || "—",
        الحالة: studentStatusLabel(item.status),
        "إجمالي الرسوم": item.total_fee || 0,
        المدفوع: item.paid_fee || 0,
        المتبقي: item.remaining_fee || 0,
        الهاتف: item.phone || "",
        العنوان: item.address || "",
      })),
      "الطلاب",
      "تقرير_الطلاب",
    );
  }

  async function exportPaymentsExcel() {
    await exportRows(
      payments.map((item) => ({
        الطالب: item.students?.full_name || "—",
        الصف: item.students?.class_name || "—",
        المبلغ: item.amount || 0,
        "طريقة الدفع": paymentMethodLabel(item.payment_method),
        التاريخ: formatNullableDate(item.created_at),
        "رقم الإيصال": item.receipt_number || "—",
        ملاحظات: item.notes || "",
      })),
      "الحسابات",
      "تقرير_الحسابات",
    );
  }

  async function exportExpensesExcel() {
    await exportRows(
      expenses.map((item) => ({
        النوع: item.expense_types?.name || "—",
        المبلغ: item.amount || 0,
        التاريخ: formatNullableDate(item.expense_date),
        المستلم: item.recipient || "—",
        "رقم الإيصال": item.receipt_number || "—",
        ملاحظات: item.notes || "",
      })),
      "المصروفات",
      "تقرير_المصروفات",
    );
  }

  async function exportAllExcel() {
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();
    const sheets = [
      {
        name: "الطلاب",
        rows: students.map((item) => ({
          الاسم: item.full_name,
          الصف: item.class_name || "—",
          الحالة: studentStatusLabel(item.status),
          الرسوم: item.total_fee || 0,
          المدفوع: item.paid_fee || 0,
          المتبقي: item.remaining_fee || 0,
        })),
      },
      {
        name: "الحسابات",
        rows: payments.map((item) => ({
          الطالب: item.students?.full_name || "—",
          المبلغ: item.amount || 0,
          التاريخ: formatNullableDate(item.created_at),
        })),
      },
      {
        name: "المصروفات",
        rows: expenses.map((item) => ({
          النوع: item.expense_types?.name || "—",
          المبلغ: item.amount || 0,
          التاريخ: formatNullableDate(item.expense_date),
        })),
      },
    ];

    sheets.forEach((sheet) => {
      if (sheet.rows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet.rows), sheet.name);
      }
    });

    XLSX.writeFile(wb, `تقرير_شامل_${formatDate(new Date())}.xlsx`);
  }

  function printDocument(title: string, content: string) {
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html dir="rtl">
        <head>
          <title>${title}</title>
          <style>
            body{font-family:var(--font-manrope),Segoe UI,sans-serif;padding:1.5rem;color:#0F2740}
            h1{color:#0F5D91;text-align:center;margin-bottom:.3rem;font-size:1.3rem}
            .sub{text-align:center;color:#666;font-size:.8rem;margin-bottom:1.2rem}
            table{width:100%;border-collapse:collapse;margin-bottom:1rem;font-size:.82rem}
            th{background:#0F5D91;color:white;padding:.5rem .7rem;text-align:left}
            td{padding:.45rem .7rem;border-bottom:1px solid #eee}
            tr:nth-child(even){background:#F6FBFF}
            .totals{background:#EEF8FF;border-radius:8px;padding:.8rem 1rem;display:flex;gap:1rem;flex-wrap:wrap}
            .total-item{font-size:.85rem}
            .total-label{color:#666}
            .total-val{font-weight:900;color:#0F5D91}
          </style>
        </head>
        <body>${content}<script>window.print();window.close();</script></body>
      </html>
    `);
  }

  function printStudents() {
    printDocument(
      "تقرير الطلاب",
      `
        <h1>تقرير الطلاب</h1>
        <div class="sub">تاريخ الطباعة: ${formatDate(new Date())}</div>
        <table>
          <thead><tr><th>#</th><th>الاسم</th><th>الصف</th><th>الحالة</th><th>إجمالي الرسوم</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
          <tbody>${students
            .map(
              (item, index) =>
                `<tr><td>${index + 1}</td><td>${item.full_name}</td><td>${item.class_name || "—"}</td><td>${studentStatusLabel(item.status)}</td><td>د.ع ${formatNumber(item.total_fee || 0)}</td><td>د.ع ${formatNumber(item.paid_fee || 0)}</td><td>د.ع ${formatNumber(item.remaining_fee || 0)}</td></tr>`,
            )
            .join("")}</tbody>
        </table>
      `,
    );
  }

  function printPayments() {
    printDocument(
      "تقرير الحسابات",
      `
        <h1>تقرير الحسابات</h1>
        <div class="sub">تاريخ الطباعة: ${formatDate(new Date())}</div>
        <table>
          <thead><tr><th>#</th><th>الطالب</th><th>الصف</th><th>المبلغ</th><th>طريقة الدفع</th><th>التاريخ</th></tr></thead>
          <tbody>${payments
            .map(
              (item, index) =>
                `<tr><td>${index + 1}</td><td>${item.students?.full_name || "—"}</td><td>${item.students?.class_name || "—"}</td><td>د.ع ${formatNumber(item.amount || 0)}</td><td>${paymentMethodLabel(item.payment_method)}</td><td>${formatNullableDate(item.created_at)}</td></tr>`,
            )
            .join("")}</tbody>
        </table>
      `,
    );
  }

  function printExpenses() {
    printDocument(
      "تقرير المصروفات",
      `
        <h1>تقرير المصروفات</h1>
        <div class="sub">تاريخ الطباعة: ${formatDate(new Date())}</div>
        <table>
          <thead><tr><th>#</th><th>النوع</th><th>المبلغ</th><th>التاريخ</th><th>المستلم</th></tr></thead>
          <tbody>${expenses
            .map(
              (item, index) =>
                `<tr><td>${index + 1}</td><td>${item.expense_types?.name || "—"}</td><td>د.ع ${formatNumber(item.amount || 0)}</td><td>${formatNullableDate(item.expense_date)}</td><td>${item.recipient || "—"}</td></tr>`,
            )
            .join("")}</tbody>
        </table>
      `,
    );
  }

  function printSummary() {
    printDocument(
      "الملخص المالي",
      `
        <h1>الملخص المالي</h1>
        <div class="sub">تاريخ الطباعة: ${formatDate(new Date())}</div>
        <div class="totals">
          <div class="total-item"><span class="total-label">إجمالي الرسوم: </span><span class="total-val">د.ع ${formatNumber(metrics.totalFees)}</span></div>
          <div class="total-item"><span class="total-label">المدفوع: </span><span class="total-val">د.ع ${formatNumber(metrics.totalPaid)}</span></div>
          <div class="total-item"><span class="total-label">المتبقي: </span><span class="total-val">د.ع ${formatNumber(metrics.totalRemaining)}</span></div>
          <div class="total-item"><span class="total-label">الحسابات المسجلة: </span><span class="total-val">د.ع ${formatNumber(metrics.paymentVolume)}</span></div>
          <div class="total-item"><span class="total-label">المصروفات: </span><span class="total-val">د.ع ${formatNumber(metrics.expenseVolume)}</span></div>
          <div class="total-item"><span class="total-label">الصافي: </span><span class="total-val">د.ع ${formatNumber(metrics.netBalance)}</span></div>
        </div>
      `,
    );
  }

  const reportCards = [
    {
      id: "students",
      title: "تقرير الطلاب",
      icon: "👥",
      color: "#1689C9",
      background: "#E6F6FF",
      description: "بيانات الطلاب والرسوم وحالة التسجيل الحالية.",
      stats: [
        { label: "إجمالي الطلاب", value: formatNumber(students.length) },
        { label: "الطلاب النشطون", value: formatNumber(metrics.activeStudents) },
        { label: "إجمالي الرسوم", value: `د.ع ${formatNumber(metrics.totalFees)}` },
        { label: "المتبقي", value: `د.ع ${formatNumber(metrics.totalRemaining)}` },
      ],
      onExcel: exportStudentsExcel,
      onPrint: printStudents,
    },
    {
      id: "payments",
      title: "تقرير الحسابات",
      icon: "💳",
      color: "#059669",
      background: "#D1FAE5",
      description: "سجل الدفعات والتحصيلات المرتبطة بالطلاب.",
      stats: [
        { label: "عدد الدفعات", value: formatNumber(payments.length) },
        { label: "إجمالي الحسابات", value: `د.ع ${formatNumber(metrics.paymentVolume)}` },
        {
          label: "دفعات اليوم",
          value: formatNumber(
            payments.filter((item) => new Date(item.created_at || "").toDateString() === new Date().toDateString()).length,
          ),
        },
      ],
      onExcel: exportPaymentsExcel,
      onPrint: printPayments,
    },
    {
      id: "expenses",
      title: "تقرير المصروفات",
      icon: "💸",
      color: "#DC2626",
      background: "#FEE2E2",
      description: "المصروفات التشغيلية حسب النوع والتاريخ.",
      stats: [
        { label: "عدد السجلات", value: formatNumber(expenses.length) },
        { label: "إجمالي المصروفات", value: `د.ع ${formatNumber(metrics.expenseVolume)}` },
        {
          label: "أنواع المصروفات",
          value: formatNumber(new Set(expenses.map((item) => item.expense_types?.name || "")).size),
        },
      ],
      onExcel: exportExpensesExcel,
      onPrint: printExpenses,
    },
    {
      id: "summary",
      title: "الملخص المالي",
      icon: "📊",
      color: "#D97706",
      background: "#FEF3C7",
      description: "ملخص الإيرادات والمصروفات وصافي الحركة المالية.",
      stats: [
        { label: "المدفوع", value: `د.ع ${formatNumber(metrics.totalPaid)}` },
        { label: "الحسابات المسجلة", value: `د.ع ${formatNumber(metrics.paymentVolume)}` },
        { label: "الصافي", value: `د.ع ${formatNumber(metrics.netBalance)}` },
      ],
      onExcel: exportAllExcel,
      onPrint: printSummary,
    },
  ];

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <>
        <style>{`
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          :root{--p2:#0F5D91;--p3:#1689C9;--p4:#69D5FF;--bg:#EEF8FF;--dark:#0F2740;--gray:#64748B;}
          body{font-family:var(--font-manrope),Segoe UI,sans-serif;direction:rtl;background:var(--bg);color:var(--dark)}
          .layout{display:flex;height:100vh}
          .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
          .topbar{background:white;padding:.7rem 1.4rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(22,137,201,0.08);flex-shrink:0}
          .topbar-title{font-size:.95rem;font-weight:800}
          .topbar-sub{font-size:.7rem;color:var(--gray)}
          .content{flex:1;overflow-y:auto;padding:1.2rem 1.4rem}
          .summary-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:1rem}
          .strip-card{background:white;border-radius:11px;padding:.8rem .9rem;box-shadow:0 2px 8px rgba(22,137,201,0.07);text-align:center}
          .strip-label{font-size:.68rem;color:var(--gray);font-weight:600}
          .strip-val{font-size:.9rem;font-weight:900;color:var(--dark);margin-top:.15rem}
          .section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:.9rem;gap:.8rem;flex-wrap:wrap}
          .section-ttl{font-size:.95rem;font-weight:900;color:var(--dark)}
          .btn-main{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer}
          .reports-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem}
          .report-card{background:white;border-radius:16px;padding:1.2rem;box-shadow:0 3px 12px rgba(22,137,201,0.08);border:1px solid rgba(22,137,201,0.06)}
          .rc-header{display:flex;align-items:center;gap:.7rem;margin-bottom:.9rem}
          .rc-ico{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
          .rc-title{font-size:.9rem;font-weight:800}
          .rc-desc{font-size:.72rem;color:var(--gray);margin-top:.15rem;line-height:1.5}
          .rc-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:.45rem;margin-bottom:.9rem}
          .rc-stat{background:#F6FBFF;border-radius:8px;padding:.45rem .6rem}
          .rc-stat-label{font-size:.64rem;color:var(--gray);font-weight:600}
          .rc-stat-val{font-size:.78rem;font-weight:800;color:var(--dark);margin-top:.1rem}
          .rc-actions{display:flex;gap:.5rem}
          .btn-excel,.btn-print{display:flex;align-items:center;gap:.3rem;padding:.45rem .8rem;border-radius:8px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.75rem;font-weight:700;cursor:pointer;flex:1;justify-content:center;border:1.5px solid transparent}
          .btn-excel{background:#D1FAE5;color:#065F46;border-color:#6EE7B7}
          .btn-print{background:#FEE2E2;color:#991B1B;border-color:#FCA5A5}
          .balance-card{border-radius:16px;padding:1.3rem 1.5rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;box-shadow:0 6px 20px rgba(22,137,201,0.3);margin-bottom:1rem}
          .balance-title{font-size:.88rem;font-weight:700;opacity:.88;margin-bottom:.8rem}
          .balance-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem}
          .balance-item{text-align:center}
          .balance-label{font-size:.72rem;opacity:.8;margin-bottom:.2rem}
          .balance-val{font-size:.95rem;font-weight:900}
          .spin{width:22px;height:22px;border:3px solid rgba(22,137,201,0.2);border-top-color:var(--p3);border-radius:50%;animation:sp .7s linear infinite;margin:3rem auto}
          @keyframes sp{to{transform:rotate(360deg)}}
          @media (max-width: 960px){
            .summary-strip,.balance-grid,.reports-grid{grid-template-columns:1fr 1fr}
          }
          @media (max-width: 640px){
            .summary-strip,.balance-grid,.reports-grid,.rc-stats{grid-template-columns:1fr}
          }
        `}</style>

        <div className="layout">
          <AppSidebar currentPath="/reports" />

          <div className="main">
            <div className="topbar">
              <div>
                <div className="topbar-title">التقارير الشاملة</div>
                <div className="topbar-sub">تقارير الطلاب والحسابات والمصروفات</div>
              </div>
            </div>

            <div className="content">
              <SchoolScopeBanner scope={schoolScope} />
              {schoolScope.shouldBlockContent ? (
                <SchoolScopeEmptyState
                  scope={schoolScope}
                  title="التقارير"
                  description="اختر مدرسة أولاً لعرض تقارير الطلاب والدفعات والمصروفات الخاصة بها."
                />
              ) : loading ? (
                <div className="spin" />
              ) : (
                <>
                  <div className="summary-strip">
                    {[
                      ["👥", "الطلاب", students.length],
                      ["💳", "الدفعات", payments.length],
                      ["💸", "المصروفات", expenses.length],
                      ["📦", "الطلاب النشطون", metrics.activeStudents],
                    ].map(([icon, label, value]) => (
                      <div className="strip-card" key={label}>
                        <div><AppIcon token={String(icon)} size={18} /></div>
                        <div className="strip-label">{label}</div>
                        <div className="strip-val">{formatNumber(Number(value))}</div>
                      </div>
                    ))}
                  </div>

                  <div className="balance-card">
                    <div className="balance-title">الملخص المالي الكلي</div>
                    <div className="balance-grid">
                      <div className="balance-item">
                        <div className="balance-label">إجمالي الرسوم</div>
                        <div className="balance-val">د.ع {formatNumber(metrics.totalFees)}</div>
                      </div>
                      <div className="balance-item">
                        <div className="balance-label">الحسابات المسجلة</div>
                        <div className="balance-val">د.ع {formatNumber(metrics.paymentVolume)}</div>
                      </div>
                      <div className="balance-item">
                        <div className="balance-label">المصروفات</div>
                        <div className="balance-val">د.ع {formatNumber(metrics.expenseVolume)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="section-hdr">
                    <div className="section-ttl">التقارير التفصيلية</div>
                    <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                      <button className="btn-main" onClick={exportAllExcel}>
                        <AppIcon token="📥" size={14} />
                        تصدير الكل إكسل
                      </button>
                      <button className="btn-main" style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }} onClick={printSummary}>
                        <AppIcon token="🖨️" size={14} />
                        طباعة الملخص
                      </button>
                    </div>
                  </div>

                  <div className="reports-grid">
                    {reportCards.map((card) => (
                      <div className="report-card" key={card.id}>
                        <div className="rc-header">
                          <div className="rc-ico" style={{ background: card.background }}>
                            <AppIcon token={card.icon} size={21} />
                          </div>
                          <div>
                            <div className="rc-title" style={{ color: card.color }}>{card.title}</div>
                            <div className="rc-desc">{card.description}</div>
                          </div>
                        </div>
                        <div className="rc-stats">
                          {card.stats.map((stat) => (
                            <div className="rc-stat" key={stat.label}>
                              <div className="rc-stat-label">{stat.label}</div>
                              <div className="rc-stat-val">{stat.value}</div>
                            </div>
                          ))}
                        </div>
                        <div className="rc-actions">
                          <button className="btn-excel" onClick={card.onExcel}>
                            <AppIcon token="📊" size={13} />
                            إكسل
                          </button>
                          <button className="btn-print" onClick={card.onPrint}>
                            <AppIcon token="🖨️" size={13} />
                            طباعة
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
