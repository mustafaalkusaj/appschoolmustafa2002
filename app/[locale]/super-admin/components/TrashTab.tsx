"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Trash2, 
  RotateCcw, 
  RefreshCw, 
  Building2, 
  Users,
  Search
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SectionCard, EmptyState, formatDate, cx } from "./UI";
import { logAction } from "@/lib/audit";

export function TrashTab() {
  const [activeEntity, setActiveEntity] = useState<"schools" | "users">("schools");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const fetchDeleted = useCallback(async () => {
    setLoading(true);
    try {
      const table = activeEntity === "schools" ? "schools" : "user_profiles";
      let q = supabase
        .from(table)
        .select("*")
        .not("deleted_at", "is", null);

      if (query) {
        if (activeEntity === "schools") {
          q = q.ilike("name", `%${query}%`);
        } else {
          q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
        }
      }

      const { data, error } = await q.order("deleted_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Failed to fetch deleted items:", err);
    } finally {
      setLoading(false);
    }
  }, [activeEntity, query]);

  useEffect(() => {
    fetchDeleted();
  }, [fetchDeleted]);

  const handleRestore = async (id: string) => {
    if (!confirm("هل أنت متأكد من استعادة هذا العنصر؟")) return;

    try {
      const table = activeEntity === "schools" ? "schools" : "user_profiles";
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: null, deleted_by: null })
        .eq("id", id);

      if (error) throw error;

      await logAction({
        action_type: "restore",
        entity_type: activeEntity === "schools" ? "school" : "user",
        entity_id: id,
        summary: `استعادة ${activeEntity === "schools" ? "مدرسة" : "مستخدم"} من سلة المحذوفات`,
      });

      fetchDeleted();
    } catch (err) {
      console.error("Restore error:", err);
      alert("فشل في استعادة العنصر");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveEntity("schools")}
          className={cx(
            "ui-button flex-1 sm:flex-none inline-flex items-center gap-2",
            activeEntity === "schools" ? "ui-button--primary" : "ui-button--secondary"
          )}
        >
          <Building2 size={16} />
          المدارس المحذوفة
        </button>
        <button
          onClick={() => setActiveEntity("users")}
          className={cx(
            "ui-button flex-1 sm:flex-none inline-flex items-center gap-2",
            activeEntity === "users" ? "ui-button--primary" : "ui-button--secondary"
          )}
        >
          <Users size={16} />
          المستخدمون المحذوفون
        </button>
      </div>

      <SectionCard
        title="سلة المحذوفات"
        description="إدارة العناصر التي تم حذفها مؤقتاً مع إمكانية استعادتها."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input 
                type="text" 
                placeholder="بحث..."
                className="ui-input min-h-0 py-2 pl-9 text-xs"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="ui-button ui-button--secondary h-9 w-9 p-0"
              onClick={() => void fetchDeleted()}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="space-y-3 py-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="sk h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState 
            icon={Trash2}
            title="السلة فارغة"
            description={`لا توجد ${activeEntity === "schools" ? "مدارس" : "مستخدمون"} محذوفة حالياً.`}
          />
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <div key={item.id} className="ui-surface flex items-center justify-between rounded-[24px] p-4 border-dashed border-2">
                <div className="flex items-center gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
                    {activeEntity === "schools" ? <Building2 size={20} /> : <Users size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-[var(--text-primary)]">
                      {activeEntity === "schools" ? item.name : item.full_name || item.email}
                    </h4>
                    <p className="text-xs font-semibold text-[var(--text-tertiary)]">
                      تاريخ الحذف: {formatDate(item.deleted_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(item.id)}
                  className="ui-button ui-button--secondary inline-flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  استعادة
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
