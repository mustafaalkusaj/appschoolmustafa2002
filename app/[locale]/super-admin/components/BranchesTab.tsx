"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  Pencil,
  Building2,
  MapPin,
  Phone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import { SectionCard, EmptyState, MigrationNotice, cx } from "./UI";
import { logAction } from "@/lib/audit";

export function BranchesTab({ infrastructure }: { infrastructure: AdminInfrastructure }) {
  const [branches, setBranches] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    school_id: "",
    address: "",
    phone: "",
    is_active: true
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let branchesQuery = supabase.from("branches").select("*, schools(name)");
      let schoolsQuery = supabase.from("schools").select("id, name").eq("is_active", true);

      if (infrastructure.softDeleteBranches) {
        branchesQuery = branchesQuery.is("deleted_at", null);
      }

      if (infrastructure.softDeleteSchools) {
        schoolsQuery = schoolsQuery.is("deleted_at", null);
      }

      const [branchesRes, schoolsRes] = await Promise.all([
        branchesQuery.order("created_at", { ascending: false }),
        schoolsQuery
      ]);

      if (branchesRes.error) throw branchesRes.error;
      if (schoolsRes.error) throw schoolsRes.error;
      setBranches(branchesRes.data || []);
      setSchools(schoolsRes.data || []);
    } catch (err) {
      console.error("Fetch branches error:", err);
    } finally {
      setLoading(false);
    }
  }, [infrastructure.softDeleteBranches, infrastructure.softDeleteSchools]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        const { error } = await supabase.from("branches").update(formData).eq("id", editingBranch.id);
        if (error) throw error;
        await logAction({ action_type: "update", entity_type: "branch", entity_id: editingBranch.id, summary: `تعديل فرع ${formData.name}` });
      } else {
        const { data, error } = await supabase.from("branches").insert([formData]).select();
        if (error) throw error;
        await logAction({ action_type: "create", entity_type: "branch", entity_id: data?.[0]?.id, summary: `إضافة فرع جديد: ${formData.name}` });
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error("Submit error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفرع؟")) return;

    if (!infrastructure.softDeleteBranches) {
      setMessage("أرشفة الفروع تحتاج تشغيل admin_infrastructure.sql لأن عمود deleted_at غير موجود في جدول branches.");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("branches")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userData.user?.id ?? null,
          is_active: false,
        })
        .eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {message ? (
        <MigrationNotice
          title="ميزة غير مفعلة بالكامل"
          description={message}
        />
      ) : null}

      <SectionCard
        title="إدارة فروع المدارس"
        description="إضافة وتعديل الفروع التابعة للمدارس المشتركة في المنصة."
        actions={
          <button 
            onClick={() => {
              setEditingBranch(null);
              setFormData({ name: "", school_id: "", address: "", phone: "", is_active: true });
              setShowForm(true);
            }}
            className="ui-button ui-button--primary inline-flex items-center gap-2"
          >
            <Plus size={16} />
            إضافة فرع
          </button>
        }
      >
        {!infrastructure.softDeleteBranches ? (
          <div className="mb-4">
            <MigrationNotice
              title="الفروع تعمل بدون سلة محذوفات"
              description="يمكن عرض وتعديل الفروع الحالية، لكن الأرشفة والاستعادة تحتاج تشغيل `admin_infrastructure.sql` لإضافة `deleted_at` و `deleted_by` إلى جدول `branches`."
            />
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-3 py-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="sk h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : branches.length === 0 ? (
          <EmptyState 
            icon={GitBranch}
            title="لا توجد فروع"
            description="لم يتم إضافة أي فروع حتى الآن."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {branches.map((branch) => (
              <div key={branch.id} className="ui-surface rounded-[28px] p-5 border border-[var(--border)]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(139,92,246,0.14)] text-[#8B5CF6]">
                      <GitBranch size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-[var(--text-primary)]">{branch.name}</h4>
                      <p className="text-[10px] font-bold text-[var(--text-tertiary)] flex items-center gap-1">
                        <Building2 size={10} />
                        {branch.schools?.name}
                      </p>
                    </div>
                  </div>
                  <span className={cx(
                    "ui-pill text-[10px]",
                    branch.is_active ? "ui-pill--success" : "ui-pill--danger"
                  )}>
                    {branch.is_active ? "نشط" : "موقف"}
                  </span>
                </div>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <MapPin size={12} className="text-[var(--text-tertiary)]" />
                    {branch.address || "بدون عنوان"}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <Phone size={12} className="text-[var(--text-tertiary)]" />
                    {branch.phone || "بدون هاتف"}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button 
                    onClick={() => {
                      setEditingBranch(branch);
                      setFormData({
                        name: branch.name,
                        school_id: branch.school_id,
                        address: branch.address || "",
                        phone: branch.phone || "",
                        is_active: branch.is_active
                      });
                      setShowForm(true);
                    }}
                    className="ui-button ui-button--secondary h-8 px-3 text-xs"
                  >
                    <Pencil size={14} className="ml-1" />
                    تعديل
                  </button>
                  <button onClick={() => handleDelete(branch.id)} className="ui-button ui-button--danger h-8 px-3 text-xs">
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
            <h3 className="text-xl font-black mb-6">{editingBranch ? "تعديل فرع" : "إضافة فرع جديد"}</h3>
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
                <label className="text-xs font-black">اسم الفرع</label>
                <input 
                  type="text" 
                  className="ui-input" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black">العنوان</label>
                <input 
                  type="text" 
                  className="ui-input" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black">رقم الهاتف</label>
                <input 
                  type="text" 
                  className="ui-input" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="branch_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                />
                <label htmlFor="branch_active" className="text-xs font-black">تفعيل الفرع</label>
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
