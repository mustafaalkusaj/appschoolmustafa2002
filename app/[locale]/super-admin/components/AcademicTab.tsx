"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Calendar, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Pencil,
  CheckCircle2,
  XCircle,
  Building2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SectionCard, EmptyState, formatDate, cx } from "./UI";
import { logAction } from "@/lib/audit";

export function AcademicTab() {
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingYear, setEditingYear] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    school_id: "",
    is_current: false,
    status: "active"
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [yearsRes, schoolsRes] = await Promise.all([
        supabase.from("academic_years").select("*, schools(name)").order("start_date", { ascending: false }),
        supabase.from("schools").select("id, name").eq("is_active", true)
      ]);

      if (yearsRes.error) throw yearsRes.error;
      setYears(yearsRes.data || []);
      setSchools(schoolsRes.data || []);
    } catch (err) {
      console.error("Fetch academic years error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingYear) {
        const { error } = await supabase
          .from("academic_years")
          .update(formData)
          .eq("id", editingYear.id);
        if (error) throw error;
        await logAction({ action_type: "update", entity_type: "academic_year", entity_id: editingYear.id, summary: `تعديل العام الدراسي ${formData.name}` });
      } else {
        const { data, error } = await supabase
          .from("academic_years")
          .insert([formData])
          .select();
        if (error) throw error;
        await logAction({ action_type: "create", entity_type: "academic_year", entity_id: data?.[0]?.id, summary: `إضافة عام دراسي جديد: ${formData.name}` });
      }
      setShowForm(false);
      setEditingYear(null);
      fetchData();
    } catch (err) {
      console.error("Submit error:", err);
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  const handleEdit = (year: any) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      start_date: year.start_date,
      end_date: year.end_date,
      school_id: year.school_id,
      is_current: year.is_current,
      status: year.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العام الدراسي؟")) return;
    try {
      const { error } = await supabase.from("academic_years").delete().eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="إدارة الأعوام الدراسية"
        description="تحديد الفترات الزمنية للدراسة لكل مدرسة وتفعيل العام الحالي."
        actions={
          <button 
            onClick={() => {
              setEditingYear(null);
              setFormData({ name: "", start_date: "", end_date: "", school_id: "", is_current: false, status: "active" });
              setShowForm(true);
            }}
            className="ui-button ui-button--primary inline-flex items-center gap-2"
          >
            <Plus size={16} />
            إضافة عام دراسي
          </button>
        }
      >
        {loading ? (
          <div className="space-y-3 py-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="sk h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : years.length === 0 ? (
          <EmptyState 
            icon={Calendar}
            title="لا توجد أعوام دراسية"
            description="ابدأ بإضافة أول عام دراسي للمنصة."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {years.map((year) => (
              <div key={year.id} className="ui-surface rounded-[28px] p-5 border border-[var(--border)]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(79,140,255,0.14)] text-[var(--primary)]">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-[var(--text-primary)]">{year.name}</h4>
                      <p className="text-[10px] font-bold text-[var(--text-tertiary)] flex items-center gap-1">
                        <Building2 size={10} />
                        {year.schools?.name || "عام"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {year.is_current && (
                      <span className="ui-pill ui-pill--success text-[10px]">الحالي</span>
                    )}
                    <span className={cx(
                      "ui-pill text-[10px]",
                      year.status === "active" ? "ui-pill--success" : "ui-pill--warning"
                    )}>
                      {year.status === "active" ? "نشط" : "مغلق"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-5">
                  <div className="p-2 rounded-xl bg-[var(--surface-muted)] text-center">
                    <p className="text-[9px] font-black text-[var(--text-tertiary)]">البداية</p>
                    <p className="text-xs font-black">{year.start_date}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-[var(--surface-muted)] text-center">
                    <p className="text-[9px] font-black text-[var(--text-tertiary)]">النهاية</p>
                    <p className="text-xs font-black">{year.end_date}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button onClick={() => handleEdit(year)} className="ui-button ui-button--secondary h-8 px-3 text-xs">
                    <Pencil size={14} className="ml-1" />
                    تعديل
                  </button>
                  <button onClick={() => handleDelete(year.id)} className="ui-button ui-button--danger h-8 px-3 text-xs">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="ui-surface w-full max-w-md rounded-[32px] p-6 shadow-2xl">
            <h3 className="text-xl font-black mb-6">{editingYear ? "تعديل عام دراسي" : "إضافة عام دراسي"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black">المدرسة</label>
                <select 
                  className="ui-input" 
                  required
                  value={formData.school_id}
                  onChange={e => setFormData({...formData, school_id: e.target.value})}
                >
                  <option value="">اختر المدرسة</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black">اسم العام (مثال: 2025-2026)</label>
                <input 
                  type="text" 
                  className="ui-input" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black">تاريخ البدء</label>
                  <input 
                    type="date" 
                    className="ui-input" 
                    required
                    value={formData.start_date}
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black">تاريخ الانتهاء</label>
                  <input 
                    type="date" 
                    className="ui-input" 
                    required
                    value={formData.end_date}
                    onChange={e => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="is_current"
                  checked={formData.is_current}
                  onChange={e => setFormData({...formData, is_current: e.target.checked})}
                />
                <label htmlFor="is_current" className="text-xs font-black">تعيين كعام حالي</label>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <button type="submit" className="ui-button ui-button--primary flex-1">حفظ</button>
                <button type="button" onClick={() => setShowForm(false)} className="ui-button ui-button--secondary flex-1">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
