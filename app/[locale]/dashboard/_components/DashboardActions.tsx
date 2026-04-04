"use client";

import { Plus, Table, Layers } from "@/lib/icons";
import { Button } from "@/components/ui/button";

interface DashboardActionsProps {
  canManageClasses: boolean;
  showFeesTable: boolean;
  onToggleFeesTable: () => void;
  onOpenNewFee: () => void;
  onOpenClassesModal: () => void;
}

export function DashboardActions({
  canManageClasses,
  showFeesTable,
  onToggleFeesTable,
  onOpenNewFee,
  onOpenClassesModal,
}: DashboardActionsProps) {
  if (!canManageClasses) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-8">
      <Button 
        onClick={onOpenNewFee}
        className="gap-2 font-bold h-11 px-6 rounded-xl shadow-lg shadow-primary/20"
      >
        <Plus size={20} strokeWidth={3} />
        إضافة قسط دراسي
      </Button>

      <Button 
        variant="secondary"
        onClick={onToggleFeesTable}
        className="gap-2 font-bold h-11 px-5 rounded-xl border-none bg-white dark:bg-slate-900/50 shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Table size={18} className="text-muted-foreground" />
        {showFeesTable ? "إخفاء الجدول" : "عرض جدول الأقساط"}
      </Button>

      <Button 
        variant="secondary"
        onClick={onOpenClassesModal}
        className="gap-2 font-bold h-11 px-5 rounded-xl border-none bg-white dark:bg-slate-900/50 shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Layers size={18} className="text-muted-foreground" />
        إدارة الصفوف والشعب
      </Button>
    </div>
  );
}
