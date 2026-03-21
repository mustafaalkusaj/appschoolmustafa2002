"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { loadXLSX } from "@/lib/xlsx-loader";
import { resolveSchoolIdForProfile } from "@/lib/school-context";

export default function ReportsPage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchAll();
  }, [profile, schoolScope.scopeLoading, schoolScope.selectedSchoolId]);

  async function fetchAll() {
    if (!profile) return;
    setLoading(true);
    const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!scopedSchoolId) {
      setStudents([]);
      setPayments([]);
      setTeachers([]);
      setSalaries([]);
      setExpenses([]);
      setLectures([]);
      setLoading(false);
      return;
    }
    let studentsQuery = supabase.from("students").select("*").neq("status","deleted");
    let paymentsQuery = supabase.from("payments").select("*, students(full_name,class_name)").order("created_at",{ascending:false});
    let teachersQuery = supabase.from("teachers").select("*").order("full_name");
    let salariesQuery = supabase.from("salaries").select("*, teachers(full_name,subject)").order("created_at",{ascending:false});
    let expensesQuery = supabase.from("expenses").select("*, expense_types(name)").order("created_at",{ascending:false});
    let lecturesQuery = supabase.from("daily_lectures").select("*, teachers(full_name)").order("lecture_date",{ascending:false});

    studentsQuery = studentsQuery.eq("school_id", scopedSchoolId);
    paymentsQuery = paymentsQuery.eq("school_id", scopedSchoolId);
    teachersQuery = teachersQuery.eq("school_id", scopedSchoolId);
    salariesQuery = salariesQuery.eq("school_id", scopedSchoolId);
    expensesQuery = expensesQuery.eq("school_id", scopedSchoolId);
    lecturesQuery = lecturesQuery.eq("school_id", scopedSchoolId);

    const [
      {data:st},{data:pay},{data:tea},{data:sal},{data:exp},{data:lec}
    ] = await Promise.all([
      studentsQuery,
      paymentsQuery,
      teachersQuery,
      salariesQuery,
      expensesQuery,
      lecturesQuery,
    ]);
    if(st)setStudents(st);
    if(pay)setPayments(pay);
    if(tea)setTeachers(tea);
    if(sal)setSalaries(sal);
    if(exp)setExpenses(exp);
    if(lec)setLectures(lec);
    setLoading(false);
  }

  // === إحصائيات ===
  const activeStudents = students.filter(s=>s.status==="active");
  const totalFees = students.reduce((a,s)=>a+s.total_fee,0);
  const totalPaid = students.reduce((a,s)=>a+s.paid_fee,0);
  const totalRemaining = students.reduce((a,s)=>a+s.remaining_fee,0);
  const totalPayments = payments.reduce((a,p)=>a+p.amount,0);
  const totalSalaries = salaries.reduce((a,s)=>a+((s.gross_salary||0)-(s.deductions||0)),0);
  const totalExpenses = expenses.reduce((a,e)=>a+e.amount,0);
  const totalLectures = lectures.reduce((a,l)=>a+l.price,0);
  const netBalance = totalPaid - totalSalaries - totalExpenses - totalLectures;

  const paymentMethodLabel = (method: string) => ({
    cash: "نقداً",
    bank_transfer: "تحويل بنكي",
    check: "شيك",
  } as Record<string, string>)[method] || method;

  const studentStatusLabel = (status: string) => ({
    active: "نشط",
    transferred: "منقول",
    suspended: "موقوف",
    graduated: "متخرج",
    withdrawn: "منسحب",
    archived: "مؤرشف",
    deleted: "محذوف",
  } as Record<string, string>)[status] || status;

  // === تصدير Excel ===
  async function exportStudentsExcel() {
    const rows = students.map(s=>({
      "الاسم":s.full_name,"الصف":s.class_name,"الحالة":studentStatusLabel(s.status),
      "إجمالي الرسوم":s.total_fee,"المدفوع":s.paid_fee,"المتبقي":s.remaining_fee,
      "الهاتف":s.phone||"","العنوان":s.address||"",
    }));
    await exportToExcel(rows,"الطلاب","تقرير_الطلاب");
  }

  async function exportPaymentsExcel() {
    const rows = payments.map(p=>({
      "اسم الطالب":p.students?.full_name||"—","الصف":p.students?.class_name||"—",
      "المبلغ":p.amount,"طريقة الدفع":paymentMethodLabel(p.payment_method),
      "التاريخ":formatDate(p.created_at),
      "رقم الإيصال":p.receipt_number||"—","ملاحظات":p.notes||"",
    }));
    await exportToExcel(rows,"الحسابات","تقرير_الحسابات");
  }

  async function exportSalariesExcel() {
    const rows = salaries.map(s=>({
      "اسم المدرس":s.teachers?.full_name||"—","التخصص":s.teachers?.subject||"—",
      "الراتب الإجمالي":s.gross_salary,"الخصومات":s.deductions||0,
      "صافي الراتب":(s.gross_salary||0)-(s.deductions||0),"الشهر":s.month,
    }));
    await exportToExcel(rows,"الرواتب","تقرير_الرواتب");
  }

  async function exportExpensesExcel() {
    const rows = expenses.map(e=>({
      "نوع المصروف":e.expense_types?.name||"—","المبلغ":e.amount,
      "التاريخ":formatDate(e.expense_date),"المستلم":e.recipient||"—",
      "رقم الإيصال":e.receipt_number||"—","ملاحظات":e.notes||"",
    }));
    await exportToExcel(rows,"المصروفات","تقرير_المصروفات");
  }

  async function exportLecturesExcel() {
    const rows = lectures.map((l:any)=>({
      "الأستاذ":l.teachers?.full_name||"—","الصف":l.grade,"الشعبة":l.section,
      "الدرس":l.period,"النوع":l.session_type==="morning"?"صباحي":"ظهري",
      "التاريخ":formatDate(l.lecture_date),"السعر":l.price,
    }));
    await exportToExcel(rows,"المحاضرات","تقرير_المحاضرات");
  }

  async function exportAllExcel() {
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();
    const sheets = [
      {data:students.map(s=>({الاسم:s.full_name,الصف:s.class_name,الحالة:studentStatusLabel(s.status),الرسوم:s.total_fee,المدفوع:s.paid_fee,المتبقي:s.remaining_fee})),name:"الطلاب"},
      {data:payments.map(p=>({الطالب:p.students?.full_name||"—",المبلغ:p.amount,التاريخ:formatDate(p.created_at)})),name:"الحسابات"},
      {data:salaries.map(s=>({المدرس:s.teachers?.full_name||"—",الإجمالي:s.gross_salary,الصافي:(s.gross_salary||0)-(s.deductions||0),الشهر:s.month})),name:"الرواتب"},
      {data:expenses.map(e=>({النوع:e.expense_types?.name||"—",المبلغ:e.amount,التاريخ:formatDate(e.expense_date)})),name:"المصروفات"},
      {data:lectures.map((l:any)=>({الأستاذ:l.teachers?.full_name||"—",الصف:l.grade,الدرس:l.period,السعر:l.price})),name:"المحاضرات"},
    ];
    sheets.forEach(s=>{if(s.data.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(s.data),s.name);});
    XLSX.writeFile(wb,`تقرير_شامل_${formatDate(new Date())}.xlsx`);
  }

  async function exportToExcel(rows:any[],sheetName:string,fileName:string) {
    const XLSX = await loadXLSX();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,sheetName);
    XLSX.writeFile(wb,`${fileName}_${formatDate(new Date())}.xlsx`);
  }

  // === تصدير PDF ===
  function printReport(title:string,headers:string[],rows:any[][],totals?:{label:string,value:string}[]) {
    const w = window.open("","_blank"); if(!w) return;
    w.document.write(`
      <html dir="rtl"><head><title>${title}</title>
      <style>
        body{font-family:var(--font-manrope),Segoe UI,sans-serif;padding:1.5rem;color:#1F1547}
        h1{color:#4C2F9E;text-align:center;margin-bottom:.3rem;font-size:1.3rem}
        .sub{text-align:center;color:#666;font-size:.8rem;margin-bottom:1.2rem}
        table{width:100%;border-collapse:collapse;margin-bottom:1rem;font-size:.82rem}
        th{background:#4C2F9E;color:white;padding:.5rem .7rem;text-align:left}
        td{padding:.45rem .7rem;border-bottom:1px solid #eee}
        tr:nth-child(even){background:#F8F6FF}
        .totals{background:#F0EEFF;border-radius:8px;padding:.8rem 1rem;display:flex;gap:2rem;flex-wrap:wrap}
        .total-item{font-size:.85rem}.total-label{color:#666}.total-val{font-weight:900;color:#4C2F9E}
        .footer{text-align:center;color:#999;font-size:.75rem;margin-top:1rem}
        @media print{body{padding:.5rem}}
      </style></head><body>
      <h1>${title}</h1>
      <div class="sub">تاريخ الطباعة: ${formatDate(new Date())} — نظام إدارة المدارس</div>
      <table>
        <thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
      ${totals?`<div class="totals">${totals.map(t=>`<div class="total-item"><span class="total-label">${t.label}: </span><span class="total-val">${t.value}</span></div>`).join("")}</div>`:""}
      <div class="footer">تم الطباعة من نظام إدارة المدرسة</div>
      <script>window.print();window.close();</script>
      </body></html>
    `);
  }

  function printStudents() {
    printReport(
      "تقرير الطلاب",
      ["#","الاسم","الصف","الحالة","إجمالي الرسوم","المدفوع","المتبقي"],
      students.map((s,i)=>[i+1,s.full_name,s.class_name,studentStatusLabel(s.status),`د.ع ${formatNumber(s.total_fee)}`,`د.ع ${formatNumber(s.paid_fee)}`,`د.ع ${formatNumber(s.remaining_fee)}`]),
      [{label:"إجمالي الطلاب",value:formatNumber(students.length)},{label:"إجمالي الرسوم",value:`د.ع ${formatNumber(totalFees)}`},{label:"المدفوع",value:`د.ع ${formatNumber(totalPaid)}`},{label:"المتبقي",value:`د.ع ${formatNumber(totalRemaining)}`}]
    );
  }

  function printPayments() {
    printReport(
      "تقرير الحسابات",
      ["#","اسم الطالب","الصف","المبلغ","طريقة الدفع","التاريخ"],
      payments.map((p,i)=>[i+1,p.students?.full_name||"—",p.students?.class_name||"—",`د.ع ${formatNumber(p.amount)}`,paymentMethodLabel(p.payment_method),formatDate(p.created_at)]),
      [{label:"إجمالي الحسابات",value:`د.ع ${formatNumber(totalPayments)}`},{label:"عدد الدفعات",value:formatNumber(payments.length)}]
    );
  }

  function printSalaries() {
    printReport(
      "تقرير الرواتب",
      ["#","اسم المدرس","التخصص","الراتب الإجمالي","الخصومات","صافي الراتب","الشهر"],
      salaries.map((s,i)=>[i+1,s.teachers?.full_name||"—",s.teachers?.subject||"—",`د.ع ${formatNumber(s.gross_salary)}`,`د.ع ${formatNumber(s.deductions||0)}`,`د.ع ${formatNumber((s.gross_salary||0)-(s.deductions||0))}`,s.month]),
      [{label:"إجمالي الرواتب المدفوعة",value:`د.ع ${formatNumber(totalSalaries)}`}]
    );
  }

  function printExpenses() {
    printReport(
      "تقرير المصروفات",
      ["#","نوع المصروف","المبلغ","التاريخ","المستلم","رقم الإيصال"],
      expenses.map((e,i)=>[i+1,e.expense_types?.name||"—",`د.ع ${formatNumber(e.amount)}`,formatDate(e.expense_date),e.recipient||"—",e.receipt_number||"—"]),
      [{label:"إجمالي المصروفات",value:`د.ع ${formatNumber(totalExpenses)}`}]
    );
  }

  function printLectures() {
    printReport(
      "تقرير المحاضرات",
      ["#","الأستاذ","الصف","الشعبة","الدرس","النوع","التاريخ","السعر"],
      lectures.map((l:any,i:number)=>[i+1,l.teachers?.full_name||"—",l.grade,l.section,`الدرس ${l.period}`,l.session_type==="morning"?"صباحي":"ظهري",formatDate(l.lecture_date),`د.ع ${formatNumber(l.price)}`]),
      [{label:"إجمالي المحاضرات",value:`د.ع ${formatNumber(totalLectures)}`},{label:"عدد المحاضرات",value:formatNumber(lectures.length)}]
    );
  }

  function printAll() {
    const w = window.open("","_blank"); if(!w) return;
    w.document.write(`
      <html dir="rtl"><head><title>التقرير الشامل</title>
      <style>
        body{font-family:var(--font-manrope),Segoe UI,sans-serif;padding:1.5rem;color:#1F1547}
        h1{color:#4C2F9E;text-align:center;margin-bottom:.3rem;font-size:1.4rem}
        h2{color:#6C4AB6;margin:1.5rem 0 .5rem;font-size:1rem;border-bottom:2px solid #EDE8FA;padding-bottom:.3rem}
        .sub{text-align:center;color:#666;font-size:.8rem;margin-bottom:1.5rem}
        table{width:100%;border-collapse:collapse;margin-bottom:1rem;font-size:.78rem}
        th{background:#4C2F9E;color:white;padding:.4rem .6rem;text-align:left}
        td{padding:.4rem .6rem;border-bottom:1px solid #eee}
        tr:nth-child(even){background:#F8F6FF}
        .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin-bottom:1.5rem}
        .sum-card{background:#F0EEFF;border-radius:8px;padding:.7rem 1rem;text-align:center}
        .sum-label{font-size:.72rem;color:#666;margin-bottom:.2rem}
        .sum-val{font-size:.95rem;font-weight:900;color:#4C2F9E}
        .page-break{page-break-before:always}
        @media print{body{padding:.5rem}}
      </style></head><body>
      <h1>التقرير الشامل — نظام إدارة المدرسة</h1>
      <div class="sub">تاريخ الطباعة: ${formatDate(new Date())}</div>

      <div class="summary">
        <div class="sum-card"><div class="sum-label">إجمالي الطلاب</div><div class="sum-val">${formatNumber(students.length)}</div></div>
        <div class="sum-card"><div class="sum-label">إجمالي الرسوم</div><div class="sum-val">د.ع ${formatNumber(totalFees)}</div></div>
        <div class="sum-card"><div class="sum-label">المبلغ المدفوع</div><div class="sum-val">د.ع ${formatNumber(totalPaid)}</div></div>
        <div class="sum-card"><div class="sum-label">المبلغ المتبقي</div><div class="sum-val">د.ع ${formatNumber(totalRemaining)}</div></div>
        <div class="sum-card"><div class="sum-label">إجمالي الرواتب</div><div class="sum-val">د.ع ${formatNumber(totalSalaries)}</div></div>
        <div class="sum-card"><div class="sum-label">إجمالي المصروفات</div><div class="sum-val">د.ع ${formatNumber(totalExpenses)}</div></div>
      </div>

      <h2>الطلاب</h2>
      <table><thead><tr><th>#</th><th>الاسم</th><th>الصف</th><th>الرسوم</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
      <tbody>${students.map((s,i)=>`<tr><td>${i+1}</td><td>${s.full_name}</td><td>${s.class_name}</td><td>د.ع ${formatNumber(s.total_fee)}</td><td>د.ع ${formatNumber(s.paid_fee)}</td><td>د.ع ${formatNumber(s.remaining_fee)}</td></tr>`).join("")}</tbody></table>

      <h2 class="page-break">الحسابات</h2>
      <table><thead><tr><th>#</th><th>الطالب</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
      <tbody>${payments.slice(0,50).map((p,i)=>`<tr><td>${i+1}</td><td>${p.students?.full_name||"—"}</td><td>د.ع ${formatNumber(p.amount)}</td><td>${formatDate(p.created_at)}</td></tr>`).join("")}</tbody></table>

      <h2>الرواتب</h2>
      <table><thead><tr><th>#</th><th>المدرس</th><th>الإجمالي</th><th>الصافي</th><th>الشهر</th></tr></thead>
      <tbody>${salaries.map((s,i)=>`<tr><td>${i+1}</td><td>${s.teachers?.full_name||"—"}</td><td>د.ع ${formatNumber(s.gross_salary)}</td><td>د.ع ${formatNumber((s.gross_salary||0)-(s.deductions||0))}</td><td>${s.month}</td></tr>`).join("")}</tbody></table>

      <h2>المصروفات</h2>
      <table><thead><tr><th>#</th><th>النوع</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
      <tbody>${expenses.map((e,i)=>`<tr><td>${i+1}</td><td>${e.expense_types?.name||"—"}</td><td>د.ع ${formatNumber(e.amount)}</td><td>${formatDate(e.expense_date)}</td></tr>`).join("")}</tbody></table>

      <script>window.print();window.close();</script>
      </body></html>
    `);
  }

  const REPORTS = [
    {
      id:"students", title:"تقرير الطلاب", icon:"👥", color:"#6C4AB6", bg:"#EDE8FA",
      desc:"جميع بيانات الطلاب مع الرسوم والمدفوع والمتبقي",
      stats:[
        {label:"إجمالي الطلاب",value:formatNumber(students.length)},
        {label:"الطلاب النشطون",value:formatNumber(activeStudents.length)},
        {label:"إجمالي الرسوم",value:`د.ع ${formatNumber(totalFees)}`},
        {label:"المدفوع",value:`د.ع ${formatNumber(totalPaid)}`},
        {label:"المتبقي",value:`د.ع ${formatNumber(totalRemaining)}`},
        {label:"نسبة التحصيل",value:totalFees>0?`${formatNumber(Math.round((totalPaid/totalFees)*100))}%`:"0%"},
      ],
      onExcel:exportStudentsExcel,
      onPdf:printStudents,
    },
    {
      id:"payments", title:"تقرير الحسابات", icon:"💳", color:"#10B981", bg:"#D1FAE5",
      desc:"سجل جميع الحسابات مع تفاصيل كل دفعة",
      stats:[
        {label:"عدد الدفعات",value:formatNumber(payments.length)},
        {label:"إجمالي الحسابات",value:`د.ع ${formatNumber(totalPayments)}`},
        {label:"دفعات اليوم",value:formatNumber(payments.filter(p=>new Date(p.created_at).toDateString()===new Date().toDateString()).length)},
        {label:"إجمالي اليوم",value:`د.ع ${formatNumber(payments.filter(p=>new Date(p.created_at).toDateString()===new Date().toDateString()).reduce((a,p)=>a+p.amount,0))}`},
      ],
      onExcel:exportPaymentsExcel,
      onPdf:printPayments,
    },
    {
      id:"salaries", title:"تقرير الرواتب", icon:"💰", color:"#3B82F6", bg:"#DBEAFE",
      desc:"رواتب المدرسين وتفاصيل الخصومات لكل شهر",
      stats:[
        {label:"عدد المدرسين",value:formatNumber(teachers.length)},
        {label:"إجمالي الرواتب المدفوعة",value:`د.ع ${formatNumber(totalSalaries)}`},
        {label:"عدد دفعات الرواتب",value:formatNumber(salaries.length)},
      ],
      onExcel:exportSalariesExcel,
      onPdf:printSalaries,
    },
    {
      id:"lectures", title:"تقرير المحاضرات", icon:"📚", color:"#8B5CF6", bg:"#EDE9FE",
      desc:"سجل جميع المحاضرات اليومية مع أسعارها",
      stats:[
        {label:"عدد المحاضرات",value:formatNumber(lectures.length)},
        {label:"إجمالي المحاضرات",value:`د.ع ${formatNumber(totalLectures)}`},
        {label:"عدد المدرسين",value:formatNumber(new Set(lectures.map((l:any)=>l.teacher_id)).size)},
      ],
      onExcel:exportLecturesExcel,
      onPdf:printLectures,
    },
    {
      id:"expenses", title:"تقرير المصروفات", icon:"💸", color:"#EF4444", bg:"#FEE2E2",
      desc:"جميع المصروفات مصنفة حسب النوع والتاريخ",
      stats:[
        {label:"عدد السجلات",value:formatNumber(expenses.length)},
        {label:"إجمالي المصروفات",value:`د.ع ${formatNumber(totalExpenses)}`},
        {label:"أنواع المصروفات",value:formatNumber(new Set(expenses.map(e=>e.expense_type_id)).size)},
      ],
      onExcel:exportExpensesExcel,
      onPdf:printExpenses,
    },
    {
      id:"financial", title:"الملخص المالي", icon:"📊", color:"#F59E0B", bg:"#FEF3C7",
      desc:"ملخص شامل لجميع الإيرادات والمصروفات والأرباح",
      stats:[
        {label:"إجمالي الإيرادات",value:`د.ع ${formatNumber(totalPaid)}`},
        {label:"إجمالي الرواتب",value:`د.ع ${formatNumber(totalSalaries)}`},
        {label:"إجمالي المصروفات",value:`د.ع ${formatNumber(totalExpenses)}`},
        {label:"إجمالي المحاضرات",value:`د.ع ${formatNumber(totalLectures)}`},
        {label:"صافي الرصيد",value:`د.ع ${formatNumber(netBalance)}`},
      ],
      onExcel:exportAllExcel,
      onPdf:printAll,
    },
  ];

  return (
  <ProtectedRoute roles={["super_admin", "admin"]}>
  <>
    <style>{`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{--p2:#4C2F9E;--p3:#6C4AB6;--p4:#9B7EDC;--bg:#F0EEFF;--dark:#1F1547;--gray:#6B7280;}
      body{font-family:var(--font-manrope),Segoe UI,sans-serif;direction:rtl;background:var(--bg);color:var(--dark)}
      .layout{display:flex;height:100vh}
      .sidebar{width:200px;background:linear-gradient(180deg,#EDE8FA,#E0D8F8);display:flex;flex-direction:column;padding:1rem .8rem;border-right:1px solid rgba(108,74,182,0.1);flex-shrink:0}
      .logo{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem;padding:.4rem}
      .logo-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--p3),var(--p4));display:flex;align-items:center;justify-content:center}
      .logo-ico svg{width:18px;height:18px;fill:white}
      .logo span{font-size:.88rem;font-weight:800;color:var(--p2)}
      .nav{display:flex;align-items:center;gap:.6rem;padding:.55rem .8rem;border-radius:9px;color:var(--p2);font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none}
      .nav:hover{background:rgba(108,74,182,0.1)}.nav.active{background:linear-gradient(135deg,var(--p3),var(--p4));color:white}
      .nav.danger{color:#EF4444}.nav.danger:hover{background:#FEE2E2}
      .sep{height:1px;background:rgba(108,74,182,0.12);margin:.4rem 0}
      .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
      .topbar{background:white;padding:.7rem 1.4rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(108,74,182,0.08);flex-shrink:0}
      .topbar-title{font-size:.95rem;font-weight:800}.topbar-sub{font-size:.7rem;color:var(--gray)}
      .content{flex:1;overflow-y:auto;padding:1.2rem 1.4rem}

      /* SUMMARY STRIP */
      .summary-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:.6rem;margin-bottom:1.2rem}
      .strip-card{background:white;border-radius:11px;padding:.7rem .9rem;box-shadow:0 2px 8px rgba(108,74,182,0.07);text-align:center}
      .strip-ico{display:flex;align-items:center;justify-content:center;margin-bottom:.2rem}
      .strip-label{font-size:.65rem;color:var(--gray);font-weight:500}
      .strip-val{font-size:.82rem;font-weight:900;color:var(--dark)}

      /* SECTION TITLE */
      .section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:.9rem}
      .section-ttl{font-size:.95rem;font-weight:900;color:var(--dark)}
      .btn-all{display:flex;align-items:center;gap:.4rem;padding:.5rem 1rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer}

      /* REPORT CARDS GRID */
      .reports-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.2rem}
      .report-card{background:white;border-radius:16px;padding:1.2rem;box-shadow:0 3px 12px rgba(108,74,182,0.08);border:1px solid rgba(108,74,182,0.06);transition:all .2s;cursor:pointer}
      .report-card:hover{box-shadow:0 6px 20px rgba(108,74,182,0.15);transform:translateY(-2px)}
      .rc-header{display:flex;align-items:center;gap:.7rem;margin-bottom:.9rem}
      .rc-ico{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .rc-title{font-size:.9rem;font-weight:800}
      .rc-desc{font-size:.72rem;color:var(--gray);margin-top:.15rem;line-height:1.4}
      .rc-stats{display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:.9rem}
      .rc-stat{background:#F8F6FF;border-radius:8px;padding:.4rem .6rem}
      .rc-stat-label{font-size:.65rem;color:var(--gray);font-weight:500}
      .rc-stat-val{font-size:.78rem;font-weight:800;color:var(--dark)}
      .rc-actions{display:flex;gap:.5rem}
      .btn-excel{display:flex;align-items:center;gap:.3rem;padding:.45rem .8rem;background:#D1FAE5;color:#065F46;border:1.5px solid #6EE7B7;border-radius:8px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.75rem;font-weight:700;cursor:pointer;flex:1;justify-content:center}
      .btn-pdf{display:flex;align-items:center;gap:.3rem;padding:.45rem .8rem;background:#FEE2E2;color:#991B1B;border:1.5px solid #FCA5A5;border-radius:8px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.75rem;font-weight:700;cursor:pointer;flex:1;justify-content:center}
      .btn-excel:hover{background:#A7F3D0}
      .btn-pdf:hover{background:#FECACA}

      /* NET BALANCE */
      .balance-card{border-radius:16px;padding:1.4rem 1.6rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;box-shadow:0 6px 20px rgba(108,74,182,0.3);margin-bottom:1.2rem}
      .balance-title{font-size:.88rem;font-weight:700;opacity:.85;margin-bottom:.8rem}
      .balance-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
      .balance-item{text-align:center}
      .balance-label{font-size:.72rem;opacity:.75;margin-bottom:.2rem}
      .balance-val{font-size:1rem;font-weight:900}
      .balance-net{text-align:center;margin-top:1rem;padding-top:.8rem;border-top:1px solid rgba(255,255,255,0.2)}
      .balance-net-label{font-size:.82rem;opacity:.85}
      .balance-net-val{font-size:1.4rem;font-weight:900;margin-top:.2rem}

      /* SPIN */
      .spin{width:22px;height:22px;border:3px solid rgba(108,74,182,0.2);border-top-color:var(--p3);border-radius:50%;animation:sp .7s linear infinite;margin:3rem auto}
      @keyframes sp{to{transform:rotate(360deg)}}
    `}</style>

    <div className="layout">
      <AppSidebar currentPath="/reports" />

      <div className="main">
        <div className="topbar">
          <div><div className="topbar-title">التقارير الشاملة</div><div className="topbar-sub">كل البيانات في مكان واحد</div></div>
        </div>
        <div className="content">
          <SchoolScopeBanner scope={schoolScope} />
          {schoolScope.shouldBlockContent ? (
            <SchoolScopeEmptyState
              scope={schoolScope}
              title="التقارير"
              description="اختر مدرسة أولاً لعرض تقارير الطلاب والدفعات والرواتب والمصروفات الخاصة بها."
            />
          ) : loading ? (
            <div className="spin" />
          ) : (
            <>

            {/* شريط الملخص */}
            <div className="summary-strip">
              {([
                ["👥","الطلاب",students.length],
                ["💳","الدفعات",payments.length],
                ["👨‍🏫","المدرسون",teachers.length],
                ["📚","المحاضرات",lectures.length],
                ["💸","المصروفات",expenses.length],
                ["📋","سجلات الرواتب",salaries.length],
              ] as any[]).map(([ico,l,v]:any,i:number)=>(
                <div className="strip-card" key={i}>
                  <div className="strip-ico"><AppIcon token={ico} size={18} /></div>
                  <div className="strip-label">{l}</div>
                  <div className="strip-val">{v}</div>
                </div>
              ))}
            </div>

            {/* الميزانية */}
            <div className="balance-card">
              <div className="balance-title" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="📊" size={16} />الملخص المالي الكلي</div>
              <div className="balance-grid">
                <div className="balance-item">
                  <div className="balance-label">إجمالي الإيرادات</div>
                  <div className="balance-val">د.ع {formatNumber(totalPaid)}</div>
                </div>
                <div className="balance-item">
                  <div className="balance-label">إجمالي الرواتب</div>
                  <div className="balance-val">د.ع {formatNumber(totalSalaries)}</div>
                </div>
                <div className="balance-item">
                  <div className="balance-label">إجمالي المصروفات</div>
                  <div className="balance-val">د.ع {formatNumber(totalExpenses)}</div>
                </div>
                <div className="balance-item">
                  <div className="balance-label">إجمالي المحاضرات</div>
                  <div className="balance-val">د.ع {formatNumber(totalLectures)}</div>
                </div>
              </div>
              <div className="balance-net">
                <div className="balance-net-label">صافي الرصيد (الإيرادات - المصروفات)</div>
                <div className="balance-net-val" style={{color:netBalance>=0?"#86EFAC":"#FCA5A5",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:".35rem"}}>
                  <AppIcon token={netBalance>=0?"✓":"⚠"} size={16} />
                  د.ع {formatNumber(Math.abs(netBalance))} {netBalance>=0?"فائض":"عجز"}
                </div>
              </div>
            </div>

            {/* عنوان */}
            <div className="section-hdr">
              <div className="section-ttl" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="📋" size={16} />التقارير التفصيلية</div>
              <div style={{display:"flex",gap:".5rem"}}>
                <button className="btn-all" onClick={exportAllExcel}><AppIcon token="📥" size={14} />تصدير الكل إكسل</button>
                <button className="btn-all" style={{background:"linear-gradient(135deg,#EF4444,#DC2626)"}} onClick={printAll}><AppIcon token="🖨️" size={14} />طباعة الكل بي دي إف</button>
              </div>
            </div>

            {/* بطاقات التقارير */}
            <div className="reports-grid">
              {REPORTS.map(r=>(
                <div className="report-card" key={r.id}>
                  <div className="rc-header">
                    <div className="rc-ico" style={{background:r.bg}}><AppIcon token={r.icon} size={21} /></div>
                    <div>
                      <div className="rc-title" style={{color:r.color}}>{r.title}</div>
                      <div className="rc-desc">{r.desc}</div>
                    </div>
                  </div>
                  <div className="rc-stats">
                    {r.stats.map((s,i)=>(
                      <div className="rc-stat" key={i}>
                        <div className="rc-stat-label">{s.label}</div>
                        <div className="rc-stat-val">{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rc-actions">
                    <button className="btn-excel" onClick={r.onExcel}><AppIcon token="📊" size={13} />إكسل</button>
                    <button className="btn-pdf" onClick={r.onPdf}><AppIcon token="🖨️" size={13} />بي دي إف</button>
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
