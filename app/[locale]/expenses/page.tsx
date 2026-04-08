"use client";
import { useCallback, useEffect, useState } from "react";
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

export default function ExpensesPage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const [activeTab, setActiveTab] = useState<"invoices"|"types">("invoices");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editExpense, setEditExpense] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    expense_type_id: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    recipient: "",
    receipt_number: "",
    notes: "",
  });

  // Type form
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editType, setEditType] = useState<any>(null);
  const [savingType, setSavingType] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: "", notes: "" });

  // Search for types
  const [typeSearch, setTypeSearch] = useState("");

  const fetchAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!scopedSchoolId) {
      setExpenses([]);
      setExpenseTypes([]);
      setLoading(false);
      return;
    }
    let expensesQuery = supabase.from("expenses").select("*, expense_types(name)").order("created_at", { ascending: false });
    let typesQuery = supabase.from("expense_types").select("*").order("name");
    expensesQuery = expensesQuery.eq("school_id", scopedSchoolId);
    typesQuery = typesQuery.eq("school_id", scopedSchoolId);

    const [{ data: exp }, { data: types }] = await Promise.all([
      expensesQuery,
      typesQuery,
    ]);
    if (exp) setExpenses(exp);
    if (types) setExpenseTypes(types);
    setLoading(false);
  }, [profile, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchAll();
  }, [profile, schoolScope.scopeLoading, fetchAll]);

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    const targetSchoolId = editExpense?.school_id || scopedSchoolId;
    if (!targetSchoolId) {
      setError("لا يمكن تحديد المدرسة لهذا السجل");
      setSaving(false);
      return;
    }
    const { data: branches } = await supabase.from("branches").select("id").eq("school_id", targetSchoolId).limit(1);
    const payload = {
      school_id: targetSchoolId,
      branch_id: branches?.[0]?.id,
      expense_type_id: form.expense_type_id || null,
      amount: parseInt(form.amount) || 0,
      expense_date: form.expense_date,
      recipient: form.recipient || null,
      receipt_number: form.receipt_number || null,
      notes: form.notes || null,
    };
    const { error } = editExpense
      ? await supabase.from("expenses").update(payload).eq("id", editExpense.id)
      : await supabase.from("expenses").insert(payload);
    if (error) setError("خطأ: " + error.message);
    else {
      setSuccess(editExpense ? "تم تحديث المصروف ✓" : "تمت إضافة المصروف ✓");
      setShowExpenseForm(false); setEditExpense(null);
      setForm({ expense_type_id: "", amount: "", expense_date: new Date().toISOString().split("T")[0], recipient: "", receipt_number: "", notes: "" });
      fetchAll(); setTimeout(() => setSuccess(""), 3000);
    }
    setSaving(false);
  }

  async function handleSaveType(e: React.FormEvent) {
    e.preventDefault(); setSavingType(true); setError("");
    const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    const targetSchoolId = editType?.school_id || scopedSchoolId;
    if (!targetSchoolId) {
      setError("لا يمكن تحديد المدرسة لهذا النوع");
      setSavingType(false);
      return;
    }
    const payload = { school_id: targetSchoolId, name: typeForm.name, notes: typeForm.notes || null };
    const { error } = editType
      ? await supabase.from("expense_types").update(payload).eq("id", editType.id)
      : await supabase.from("expense_types").insert(payload);
    if (error) setError("خطأ: " + error.message);
    else {
      setSuccess(editType ? "تم تحديث النوع ✓" : "تمت إضافة النوع ✓");
      setShowTypeForm(false); setEditType(null);
      setTypeForm({ name: "", notes: "" });
      fetchAll(); setTimeout(() => setSuccess(""), 3000);
    }
    setSavingType(false);
  }

  async function deleteExpense(id: string) {
    if (!confirm("هل تريد حذف هذا المصروف؟")) return;
    await supabase.from("expenses").delete().eq("id", id);
    fetchAll();
  }

  async function deleteType(id: string) {
    if (!confirm("هل تريد حذف هذا النوع؟")) return;
    await supabase.from("expense_types").delete().eq("id", id);
    fetchAll();
  }

  function openEditExpense(exp: any) {
    setEditExpense(exp);
    setForm({
      expense_type_id: exp.expense_type_id || "",
      amount: exp.amount?.toString() || "",
      expense_date: exp.expense_date || new Date().toISOString().split("T")[0],
      recipient: exp.recipient || "",
      receipt_number: exp.receipt_number || "",
      notes: exp.notes || "",
    });
    setShowExpenseForm(true);
  }

  function openEditType(t: any) {
    setEditType(t);
    setTypeForm({ name: t.name, notes: t.notes || "" });
    setShowTypeForm(true);
  }

  async function exportExcel() {
    const XLSX = await loadXLSX();
    const rows = filteredExpenses.map((e, i) => ({
      "#": i + 1,
      "نوع المصروف": e.expense_types?.name || "—",
      "المبلغ": e.amount,
      "التاريخ": e.expense_date,
      "مستلم الفاتورة": e.recipient || "—",
      "رقم الإيصال": e.receipt_number || "—",
      "ملاحظة": e.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المصاريف");
    XLSX.writeFile(wb, `مصاريف_${formatDate(new Date())}.xlsx`);
  }

  async function exportTypesExcel() {
    const XLSX = await loadXLSX();
    const rows = expenseTypes.map((t, i) => ({ "#": i + 1, "الاسم": t.name, "ملاحظات": t.notes || "" }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "أنواع المصروفات");
    XLSX.writeFile(wb, `أنواع_المصاريف.xlsx`);
  }

  const filteredExpenses = expenses.filter(e => {
    const matchSearch = !search || e.expense_types?.name?.includes(search) || e.notes?.includes(search) || e.recipient?.includes(search) || e.receipt_number?.includes(search);
    const matchFrom = !filterFrom || e.expense_date >= filterFrom;
    const matchTo = !filterTo || e.expense_date <= filterTo;
    return matchSearch && matchFrom && matchTo;
  });

  const filteredTypes = expenseTypes.filter(t => !typeSearch || t.name.includes(typeSearch));

  const totalFiltered = filteredExpenses.reduce((a, e) => a + (e.amount || 0), 0);
  const totalAll = expenses.reduce((a, e) => a + (e.amount || 0), 0);

  return (
  <ProtectedRoute roles={["super_admin", "admin"]}>
  <>
    <style>{`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{--p2:#0F5D91;--p3:#1689C9;--p4:#69D5FF;--bg:#EEF8FF;--dark:#0F2740;--gray:#64748B;}
      body{font-family:var(--font-manrope),Segoe UI,sans-serif;direction:rtl;background:var(--bg);color:var(--dark)}
      .layout{display:flex;height:100vh}
      .sidebar{width:200px;background:linear-gradient(180deg,#E6F6FF,#D4F1FF);display:flex;flex-direction:column;padding:1rem .8rem;border-right:1px solid rgba(22,137,201,0.1);flex-shrink:0}
      .logo{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem;padding:.4rem}
      .logo-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--p3),var(--p4));display:flex;align-items:center;justify-content:center}
      .logo-ico svg{width:18px;height:18px;fill:white}
      .logo span{font-size:.88rem;font-weight:800;color:var(--p2)}
      .nav{display:flex;align-items:center;gap:.6rem;padding:.55rem .8rem;border-radius:9px;color:var(--p2);font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none}
      .nav:hover{background:rgba(22,137,201,0.1)}.nav.active{background:linear-gradient(135deg,var(--p3),var(--p4));color:white}
      .nav.danger{color:#EF4444}.nav.danger:hover{background:#FEE2E2}
      .sep{height:1px;background:rgba(22,137,201,0.12);margin:.4rem 0}
      .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
      .topbar{background:white;padding:.7rem 1.4rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(22,137,201,0.08);flex-shrink:0}
      .topbar-title{font-size:.95rem;font-weight:800}.topbar-sub{font-size:.7rem;color:var(--gray)}
      .content{flex:1;overflow-y:auto;padding:1.2rem 1.4rem}

      /* STATS */
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:1rem}
      .sc{background:white;border-radius:12px;padding:.8rem 1rem;display:flex;align-items:center;gap:.8rem;box-shadow:0 2px 8px rgba(22,137,201,0.07)}
      .sc-ico{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.2rem}
      .sc-label{font-size:.7rem;color:var(--gray)}.sc-val{font-size:.9rem;font-weight:800}

      /* ACTIONS SECTION */
      .actions-section{background:white;border-radius:14px;padding:1rem 1.2rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(22,137,201,0.06)}
      .actions-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.8rem}
      .actions-title{font-size:.85rem;font-weight:800;color:var(--dark)}
      .actions-btns{display:flex;gap:.6rem}

      /* FILTER SECTION */
      .filter-section{background:white;border-radius:14px;padding:1rem 1.2rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(22,137,201,0.06)}
      .filter-title{font-size:.82rem;font-weight:700;color:var(--p2);margin-bottom:.7rem;display:flex;align-items:center;gap:.3rem}
      .filter-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.7rem}
      .fg-item{display:flex;flex-direction:column;gap:.25rem}
      .fg-label{font-size:.72rem;font-weight:600;color:var(--gray)}
      .fi{padding:.5rem .8rem;background:#F6FBFF;border:1.5px solid rgba(22,137,201,0.12);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;direction:rtl;outline:none;color:var(--dark)}
      .fi:focus{border-color:var(--p3)}

      /* TABS */
      .page-tabs{display:flex;gap:.5rem;margin-bottom:1rem}
      .page-tab{display:flex;align-items:center;gap:.4rem;padding:.55rem 1.2rem;border-radius:20px;cursor:pointer;font-size:.82rem;font-weight:700;border:none;font-family:var(--font-manrope),Segoe UI,sans-serif;transition:all .2s}
      .page-tab.active{background:linear-gradient(135deg,var(--p3),var(--p2));color:white;box-shadow:0 3px 10px rgba(22,137,201,0.3)}
      .page-tab:not(.active){background:white;color:var(--gray);box-shadow:0 2px 6px rgba(22,137,201,0.06)}
      .page-tab:not(.active):hover{background:#EEF8FF;color:var(--p3)}

      /* TABLE */
      .tbl-header{display:flex;align-items:center;justify-content:space-between;background:white;border-radius:13px 13px 0 0;padding:.8rem 1.2rem;border-bottom:1px solid rgba(22,137,201,0.06)}
      .tbl-count{display:inline-flex;align-items:center;background:var(--p3);color:white;border-radius:20px;padding:.15rem .65rem;font-size:.75rem;font-weight:700}
      .tbl-title{font-size:.88rem;font-weight:800}
      .tbl-wrap{background:white;border-radius:13px;overflow:hidden;box-shadow:0 2px 8px rgba(22,137,201,0.06)}
      .tbl-srch{display:flex;align-items:center;gap:.5rem;padding:.7rem 1.2rem;border-bottom:1px solid rgba(22,137,201,0.05)}
      .tbl-srch input{flex:1;padding:.5rem .8rem;background:#F6FBFF;border:1.5px solid rgba(22,137,201,0.1);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;direction:rtl;outline:none}
      .tbl-srch input:focus{border-color:var(--p3)}
      table{width:100%;border-collapse:collapse}
      thead{background:#F6FBFF}
      th{padding:.6rem .9rem;font-size:.72rem;font-weight:700;color:var(--p2);text-align:left;border-bottom:1px solid rgba(22,137,201,0.08)}
      td{padding:.6rem .9rem;font-size:.78rem;border-bottom:1px solid rgba(22,137,201,0.04)}
      tr:last-child td{border-bottom:none}tr:hover td{background:#FAFAFE}
      .badge{display:inline-block;padding:.18rem .55rem;border-radius:20px;font-size:.66rem;font-weight:700}
      .num-badge{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:var(--p3);color:white;font-size:.75rem;font-weight:800}
      .empty{text-align:center;padding:3rem;color:var(--gray);font-size:.85rem}
      .spin{width:22px;height:22px;border:3px solid rgba(22,137,201,0.2);border-top-color:var(--p3);border-radius:50%;animation:sp .7s linear infinite;margin:2rem auto}
      @keyframes sp{to{transform:rotate(360deg)}}
      .btn-edit-row{width:28px;height:28px;background:#DBEAFE;color:#1E40AF;border:none;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.82rem}
      .btn-del-row{width:28px;height:28px;background:#FEE2E2;color:#EF4444;border:none;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.82rem}

      /* BUTTONS */
      .btn-add{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}
      .btn-excel{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:#D1FAE5;color:#065F46;border:1.5px solid #6EE7B7;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}
      .btn-refresh{width:34px;height:34px;background:#EEF8FF;color:var(--p3);border:none;border-radius:9px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center}

      /* TOTAL BAR */
      .total-bar{background:linear-gradient(135deg,var(--p3),var(--p2));border-radius:0 0 13px 13px;padding:.7rem 1.2rem;display:flex;align-items:center;justify-content:space-between;color:white}
      .total-label{font-size:.8rem;font-weight:600;opacity:.85}
      .total-val{font-size:.95rem;font-weight:900}

      /* MODALS */
      .ok{background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
      .err{background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
      .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
      .modal{background:white;border-radius:18px;padding:1.6rem;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2)}
      .mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem}
      .mt{font-size:1rem;font-weight:800}.mc{width:30px;height:30px;border-radius:7px;background:#F3F4F6;border:none;cursor:pointer;font-size:1rem}
      .fg{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
      .ff{display:flex;flex-direction:column;gap:.32rem}.ff.full{grid-column:1/-1}
      .fl{font-size:.76rem;font-weight:600}.opt{font-size:.68rem;color:var(--gray);font-weight:400}
      .fis{padding:.65rem .85rem;background:#F6FBFF;border:1.5px solid rgba(22,137,201,0.12);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.82rem;direction:rtl;outline:none;width:100%}
      .fis:focus{border-color:var(--p3);background:white}
      .fa{display:flex;gap:.7rem;margin-top:1.1rem}
      .bs{flex:1;padding:.75rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer}
      .bs:disabled{opacity:.65;cursor:not-allowed}
      .bc{padding:.75rem 1.2rem;background:#F3F4F6;color:var(--gray);border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:600;cursor:pointer}
    `}</style>

    <div className="layout">
      <AppSidebar currentPath="/expenses" />

      <div className="main">
        <div className="topbar">
          <div><div className="topbar-title">إدارة المصروفات</div><div className="topbar-sub">{expenses.length} سجل مصروف</div></div>
        </div>
        <div className="content">
          {success&&<div className="ok">{success}</div>}
          {error&&<div className="err">{error}</div>}
          <SchoolScopeBanner scope={schoolScope} />
          {schoolScope.shouldBlockContent ? (
            <SchoolScopeEmptyState
              scope={schoolScope}
              title="المصروفات"
              description="لن يتم تحميل فواتير المصروفات أو أنواعها قبل اختيار مدرسة صريحة لهذا القسم."
            />
          ) : (
            <>
              {/* إحصائيات */}
              <div className="stats">
                {([
                  ["💰","إجمالي المصروفات",`د.ع ${formatNumber(totalAll)}`,"#E6F6FF"],
                  ["📋","عدد السجلات",formatNumber(expenses.length),"#DBEAFE"],
                  ["🏷️","أنواع المصروفات",formatNumber(expenseTypes.length),"#D1FAE5"],
                  ["📅","مصاريف اليوم",`د.ع ${formatNumber(expenses.filter(e=>e.expense_date===new Date().toISOString().split("T")[0]).reduce((a,e)=>a+e.amount,0))}`,"#FEF3C7"],
                ] as any[]).map(([ico,l,v,bg]:any,i:number)=>(
                  <div className="sc" key={i}>
                    <div className="sc-ico" style={{background:bg}}><AppIcon token={ico} size={18} /></div>
                    <div><div className="sc-label">{l}</div><div className="sc-val">{v}</div></div>
                  </div>
                ))}
              </div>

              {/* قسم الإجراءات */}
              <div className="actions-section">
                <div className="actions-header">
                  <div className="actions-title" style={{display:"flex",alignItems:"center",gap:".35rem"}}>
                    <AppIcon token="⚙️" size={14} />
                    الإجراءات
                  </div>
                  <div className="actions-btns">
                    <button className="btn-excel" onClick={activeTab==="invoices"?exportExcel:exportTypesExcel}>
                      <AppIcon token="⬇️" size={14} />
                      تحميل إكسل
                    </button>
                    <button className="btn-add" onClick={()=>{
                      if(activeTab==="invoices"){setEditExpense(null);setForm({expense_type_id:"",amount:"",expense_date:new Date().toISOString().split("T")[0],recipient:"",receipt_number:"",notes:""});setShowExpenseForm(true);}
                      else{setEditType(null);setTypeForm({name:"",notes:""});setShowTypeForm(true);}
                    }}>
                      + {activeTab==="invoices"?"إضافة مصروف":"إضافة نوع"}
                    </button>
                  </div>
                </div>

            {/* فلترة - فقط في الفواتير */}
            {activeTab==="invoices"&&(
              <div>
                <div className="filter-title"><AppIcon token="🔍" size={13} /> تصفية</div>
                <div className="filter-grid">
                  <div className="fg-item">
                    <label className="fg-label">من تاريخ</label>
                    <input type="date" className="fi" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)}/>
                  </div>
                  <div className="fg-item">
                    <label className="fg-label">إلى تاريخ</label>
                    <input type="date" className="fi" value={filterTo} onChange={e=>setFilterTo(e.target.value)}/>
                  </div>
                  <div className="fg-item">
                    <label className="fg-label">نوع المصروف</label>
                    <select className="fi" value={search} onChange={e=>setSearch(e.target.value)}>
                      <option value="">الكل</option>
                      {expenseTypes.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* تبويبات */}
          <div className="page-tabs">
            <button className={`page-tab${activeTab==="invoices"?" active":""}`} onClick={()=>setActiveTab("invoices")}>
              <AppIcon token="📋" size={14} />
              المصروفات
              <span style={{background:"rgba(255,255,255,0.25)",padding:".1rem .5rem",borderRadius:10,fontSize:".72rem"}}>{expenses.length}</span>
            </button>
            <button className={`page-tab${activeTab==="types"?" active":""}`} onClick={()=>setActiveTab("types")}>
              <AppIcon token="🏷️" size={14} />
              أنواع المصروفات
              <span style={{background:"rgba(255,255,255,0.25)",padding:".1rem .5rem",borderRadius:10,fontSize:".72rem"}}>{expenseTypes.length}</span>
            </button>
          </div>

          {/* جدول الفواتير */}
          {activeTab==="invoices"&&(
            <div className="tbl-wrap">
              <div className="tbl-header">
                <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
                  <span className="tbl-count">{filteredExpenses.length} السجلات</span>
                  <span className="tbl-title">المصروفات</span>
                </div>
                <button className="btn-refresh" onClick={fetchAll}>↺</button>
              </div>
              <div className="tbl-srch">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:"var(--gray)",flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              {loading?<div className="spin"/>:filteredExpenses.length===0?(
                <div className="empty">لا توجد مصروفات حالياً، اضغط على إضافة مصروف</div>
              ):(
                <>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>نوع المصروف</th>
                        <th>المبلغ</th>
                        <th>التاريخ</th>
                        <th>مستلم الفاتورة</th>
                        <th>رقم الإيصال</th>
                        <th>ملاحظة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((e, i) => (
                        <tr key={e.id}>
                          <td><span className="num-badge">{filteredExpenses.length - i}</span></td>
                          <td>
                            <span className="badge" style={{background:"#E6F6FF",color:"var(--p3)"}}>
                              {e.expense_types?.name||"—"}
                            </span>
                          </td>
                          <td style={{fontWeight:800,color:"#EF4444"}}>د.ع {formatNumber(e.amount)}</td>
                          <td style={{color:"var(--gray)",fontSize:".75rem"}}>{formatDate(e.expense_date)}</td>
                          <td style={{color:"var(--gray)"}}>{e.recipient||"—"}</td>
                          <td style={{color:"var(--p3)",fontWeight:600,fontSize:".75rem"}}>{e.receipt_number||"—"}</td>
                          <td style={{color:"var(--gray)",fontSize:".75rem",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.notes||"—"}</td>
                          <td>
                            <div style={{display:"flex",gap:".3rem"}}>
                              <button className="btn-edit-row" onClick={()=>openEditExpense(e)}><AppIcon token="✏️" size={14} /></button>
                              <button className="btn-del-row" onClick={()=>deleteExpense(e.id)}><AppIcon token="🗑️" size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="total-bar">
                    <span className="total-label">إجمالي النتائج المعروضة ({formatNumber(filteredExpenses.length)} سجل)</span>
                    <span className="total-val">د.ع {formatNumber(totalFiltered)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* جدول أنواع المصروفات */}
          {activeTab==="types"&&(
            <div className="tbl-wrap">
              <div className="tbl-header">
                <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
                  <span className="tbl-count">{filteredTypes.length} السجلات</span>
                  <span className="tbl-title">أنواع المصروفات</span>
                </div>
                <button className="btn-refresh" onClick={fetchAll}>↺</button>
              </div>
              <div className="tbl-srch">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:"var(--gray)",flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input placeholder="بحث..." value={typeSearch} onChange={e=>setTypeSearch(e.target.value)}/>
              </div>
              {loading?<div className="spin"/>:filteredTypes.length===0?(
                <div className="empty">لا توجد أنواع حالياً، اضغط على إضافة نوع</div>
              ):(
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الاسم</th>
                      <th>ملاحظات</th>
                      <th>عدد الاستخدامات</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTypes.map((t, i) => {
                      const usageCount = expenses.filter(e => e.expense_type_id === t.id).length;
                      const usageTotal = expenses.filter(e => e.expense_type_id === t.id).reduce((a,e)=>a+e.amount,0);
                      return (
                        <tr key={t.id}>
                          <td><span className="num-badge">{i+1}</span></td>
                          <td style={{fontWeight:700}}>{t.name}</td>
                          <td style={{color:"var(--gray)",fontSize:".75rem"}}>{t.notes||"—"}</td>
                          <td>
                            <div style={{fontSize:".78rem"}}>
                              <span className="badge" style={{background:"#DBEAFE",color:"#1E40AF",marginLeft:".3rem"}}>{formatNumber(usageCount)} مرة</span>
                              {usageCount>0&&<span style={{color:"var(--gray)"}}>· د.ع {formatNumber(usageTotal)}</span>}
                            </div>
                          </td>
                          <td>
                            <div style={{display:"flex",gap:".3rem"}}>
                              <button className="btn-edit-row" onClick={()=>openEditType(t)}><AppIcon token="✏️" size={14} /></button>
                              <button className="btn-del-row" onClick={()=>deleteType(t.id)}><AppIcon token="🗑️" size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>

    {/* MODAL: إضافة/تعديل مصروف */}
    {showExpenseForm&&(
      <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowExpenseForm(false)}}>
        <div className="modal">
          <div className="mh">
            <div className="mt" style={{display:"flex",alignItems:"center",gap:".35rem"}}>
              <AppIcon token={editExpense?"✏️":"💸"} size={16} />
              {editExpense?"تعديل المصروف":"إضافة مصروف جديد"}
            </div>
            <button className="mc" onClick={()=>setShowExpenseForm(false)}><AppIcon token="✕" size={14} /></button>
          </div>
          <form onSubmit={handleSaveExpense}>
            <div className="fg">
              <div className="ff full">
                <label className="fl">نوع المصروف *</label>
                <select className="fis" required value={form.expense_type_id} onChange={e=>setForm({...form,expense_type_id:e.target.value})}>
                  <option value="">اختر نوع المصروف...</option>
                  {expenseTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="ff">
                <label className="fl">المبلغ (د.ع) *</label>
                <input className="fis" type="number" required placeholder="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
              </div>
              <div className="ff">
                <label className="fl">التاريخ *</label>
                <input className="fis" type="date" required value={form.expense_date} onChange={e=>setForm({...form,expense_date:e.target.value})}/>
              </div>
              <div className="ff">
                <label className="fl">مستلم الفاتورة <span className="opt">(اختياري)</span></label>
                <input className="fis" placeholder="اسم المستلم..." value={form.recipient} onChange={e=>setForm({...form,recipient:e.target.value})}/>
              </div>
              <div className="ff">
                <label className="fl">رقم الإيصال <span className="opt">(اختياري)</span></label>
                <input className="fis" placeholder="رقم الإيصال..." value={form.receipt_number} onChange={e=>setForm({...form,receipt_number:e.target.value})}/>
              </div>
              <div className="ff full">
                <label className="fl">ملاحظة <span className="opt">(اختياري)</span></label>
                <textarea className="fis" rows={3} style={{resize:"none"}} placeholder="أي ملاحظات..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
              </div>
            </div>
            <div className="fa">
              <button type="submit" className="bs" disabled={saving}>{saving?"جارٍ الحفظ...":(editExpense?"حفظ التعديلات":"إضافة مصروف")}</button>
              <button type="button" className="bc" onClick={()=>setShowExpenseForm(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL: إضافة/تعديل نوع */}
    {showTypeForm&&(
      <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowTypeForm(false)}}>
        <div className="modal" style={{maxWidth:420}}>
          <div className="mh">
            <div className="mt" style={{display:"flex",alignItems:"center",gap:".35rem"}}>
              <AppIcon token={editType?"✏️":"🏷️"} size={16} />
              {editType?"تعديل النوع":"إضافة نوع مصروف"}
            </div>
            <button className="mc" onClick={()=>setShowTypeForm(false)}><AppIcon token="✕" size={14} /></button>
          </div>
          <form onSubmit={handleSaveType}>
            <div className="fg">
              <div className="ff full">
                <label className="fl">اسم النوع *</label>
                <input className="fis" required placeholder="مثال: مصاريف صيانة" value={typeForm.name} onChange={e=>setTypeForm({...typeForm,name:e.target.value})}/>
              </div>
              <div className="ff full">
                <label className="fl">ملاحظات <span className="opt">(اختياري)</span></label>
                <textarea className="fis" rows={3} style={{resize:"none"}} placeholder="أي ملاحظات..." value={typeForm.notes} onChange={e=>setTypeForm({...typeForm,notes:e.target.value})}/>
              </div>
            </div>
            <div className="fa">
              <button type="submit" className="bs" disabled={savingType}>{savingType?"جارٍ الحفظ...":(editType?"حفظ التعديلات":"إضافة نوع")}</button>
              <button type="button" className="bc" onClick={()=>setShowTypeForm(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
  </ProtectedRoute>
  );
}
