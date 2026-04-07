"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
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
    <div className="app-layout">
      <AppSidebar currentPath="/expenses" />

      <div className="app-main">
        <AppShellTopbar
          title="إدارة المصروفات"
          subtitle={`${expenses.length} سجل مصروف`}
          scope={schoolScope}
        />
        <div className="content app-shell-content">
          {success&&<div className="msg-success">{success}</div>}
          {error&&<div className="msg-error">{error}</div>}
          <SchoolScopeBanner scope={schoolScope} showSelector={false} />
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
                  ["💰","إجمالي المصروفات",`د.ع ${formatNumber(totalAll)}`,"var(--primary-subtle)"],
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
                  <div className="actions-title" style={{display:"flex",alignItems:"center",gap:".35rem",color:"var(--text-primary)"}}>
                    <AppIcon token="⚙️" size={14} />
                    الإجراءات
                  </div>
                  <div className="actions-btns">
                    <button className="ui-button ui-button--success h-9 px-4 text-sm inline-flex items-center gap-1.5" onClick={activeTab==="invoices"?exportExcel:exportTypesExcel}>
                      <AppIcon token="⬇️" size={14} />
                      تحميل إكسل
                    </button>
                    <button className="ui-button ui-button--primary h-9 px-4 text-sm inline-flex items-center gap-1.5" onClick={()=>{
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
                <div className="filter-title" style={{color:"var(--primary)"}}><AppIcon token="🔍" size={13} /> تصفية</div>
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
                <button className="ui-button ui-button--ghost" style={{width:34,height:34}} onClick={fetchAll}>↺</button>
              </div>
              <div className="tbl-srch">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:"var(--text-tertiary)",flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
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
                            <span className="badge badge--info" style={{background:"var(--primary-subtle)",color:"var(--primary)"}}>
                              {e.expense_types?.name||"—"}
                            </span>
                          </td>
                          <td style={{fontWeight:800,color:"var(--danger)"}}>د.ع {formatNumber(e.amount)}</td>
                          <td style={{color:"var(--text-tertiary)",fontSize:".75rem"}}>{formatDate(e.expense_date)}</td>
                          <td style={{color:"var(--text-tertiary)"}}>{e.recipient||"—"}</td>
                          <td style={{color:"var(--primary)",fontWeight:600,fontSize:".75rem"}}>{e.receipt_number||"—"}</td>
                          <td style={{color:"var(--text-tertiary)",fontSize:".75rem",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.notes||"—"}</td>
                          <td>
                            <div style={{display:"flex",gap:".3rem"}}>
                              <button className="ui-button ui-button--ghost" style={{width:28,height:28,background:"#DBEAFE",color:"#1E40AF",borderRadius:7}} onClick={()=>openEditExpense(e)}><AppIcon token="✏️" size={14} /></button>
                              <button className="ui-button ui-button--danger" style={{width:28,height:28,borderRadius:7,padding:0}} onClick={()=>deleteExpense(e.id)}><AppIcon token="🗑️" size={14} /></button>
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
                <button className="ui-button ui-button--ghost" style={{width:34,height:34}} onClick={fetchAll}>↺</button>
              </div>
              <div className="tbl-srch">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:"var(--text-tertiary)",flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
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
                          <td style={{color:"var(--text-tertiary)",fontSize:".75rem"}}>{t.notes||"—"}</td>
                          <td>
                            <div style={{fontSize:".78rem"}}>
                              <span className="badge badge--info" style={{marginLeft:".3rem"}}>{formatNumber(usageCount)} مرة</span>
                              {usageCount>0&&<span style={{color:"var(--text-tertiary)"}}>· د.ع {formatNumber(usageTotal)}</span>}
                            </div>
                          </td>
                          <td>
                            <div style={{display:"flex",gap:".3rem"}}>
                              <button className="ui-button ui-button--ghost" style={{width:28,height:28,background:"#DBEAFE",color:"#1E40AF",borderRadius:7}} onClick={()=>openEditType(t)}><AppIcon token="✏️" size={14} /></button>
                              <button className="ui-button ui-button--danger" style={{width:28,height:28,borderRadius:7,padding:0}} onClick={()=>deleteType(t.id)}><AppIcon token="🗑️" size={14} /></button>
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
      <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowExpenseForm(false)}}>
        <div className="modal-box">
          <div className="modal-header">
            <div style={{display:"flex",alignItems:"center",gap:".35rem",fontWeight:800,fontSize:"1rem"}}>
              <AppIcon token={editExpense?"✏️":"💸"} size={16} />
              {editExpense?"تعديل المصروف":"إضافة مصروف جديد"}
            </div>
            <button className="ui-button ui-button--ghost" style={{width:30,height:30,borderRadius:7}} onClick={()=>setShowExpenseForm(false)}><AppIcon token="✕" size={14} /></button>
          </div>
          <form onSubmit={handleSaveExpense}>
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">نوع المصروف *</label>
                <select className="form-select" required value={form.expense_type_id} onChange={e=>setForm({...form,expense_type_id:e.target.value})}>
                  <option value="">اختر نوع المصروف...</option>
                  {expenseTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">المبلغ (د.ع) *</label>
                <input className="form-input" type="number" required placeholder="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">التاريخ *</label>
                <input className="form-input" type="date" required value={form.expense_date} onChange={e=>setForm({...form,expense_date:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">مستلم الفاتورة <span style={{fontSize:".68rem",color:"var(--text-tertiary)",fontWeight:400}}>(اختياري)</span></label>
                <input className="form-input" placeholder="اسم المستلم..." value={form.recipient} onChange={e=>setForm({...form,recipient:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">رقم الإيصال <span style={{fontSize:".68rem",color:"var(--text-tertiary)",fontWeight:400}}>(اختياري)</span></label>
                <input className="form-input" placeholder="رقم الإيصال..." value={form.receipt_number} onChange={e=>setForm({...form,receipt_number:e.target.value})}/>
              </div>
              <div className="form-group full">
                <label className="form-label">ملاحظة <span style={{fontSize:".68rem",color:"var(--text-tertiary)",fontWeight:400}}>(اختياري)</span></label>
                <textarea className="form-input" rows={3} style={{resize:"none"}} placeholder="أي ملاحظات..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
              </div>
            </div>
            <div className="modal-actions">
              <button type="submit" className="ui-button ui-button--primary" style={{flex:1}} disabled={saving}>{saving?"جارٍ الحفظ...":(editExpense?"حفظ التعديلات":"إضافة مصروف")}</button>
              <button type="button" className="ui-button ui-button--secondary" onClick={()=>setShowExpenseForm(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL: إضافة/تعديل نوع */}
    {showTypeForm&&(
      <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowTypeForm(false)}}>
        <div className="modal-box" style={{maxWidth:420}}>
          <div className="modal-header">
            <div style={{display:"flex",alignItems:"center",gap:".35rem",fontWeight:800,fontSize:"1rem"}}>
              <AppIcon token={editType?"✏️":"🏷️"} size={16} />
              {editType?"تعديل النوع":"إضافة نوع مصروف"}
            </div>
            <button className="ui-button ui-button--ghost" style={{width:30,height:30,borderRadius:7}} onClick={()=>setShowTypeForm(false)}><AppIcon token="✕" size={14} /></button>
          </div>
          <form onSubmit={handleSaveType}>
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">اسم النوع *</label>
                <input className="form-input" required placeholder="مثال: مصاريف صيانة" value={typeForm.name} onChange={e=>setTypeForm({...typeForm,name:e.target.value})}/>
              </div>
              <div className="form-group full">
                <label className="form-label">ملاحظات <span style={{fontSize:".68rem",color:"var(--text-tertiary)",fontWeight:400}}>(اختياري)</span></label>
                <textarea className="form-input" rows={3} style={{resize:"none"}} placeholder="أي ملاحظات..." value={typeForm.notes} onChange={e=>setTypeForm({...typeForm,notes:e.target.value})}/>
              </div>
            </div>
            <div className="modal-actions">
              <button type="submit" className="ui-button ui-button--primary" style={{flex:1}} disabled={savingType}>{savingType?"جارٍ الحفظ...":(editType?"حفظ التعديلات":"إضافة نوع")}</button>
              <button type="button" className="ui-button ui-button--secondary" onClick={()=>setShowTypeForm(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </ProtectedRoute>
  );
}
