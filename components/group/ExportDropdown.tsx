"use client";
import { useState } from "react";
import { Download, ChevronDown, FileSpreadsheet, Printer } from "lucide-react";

export function ExportDropdown({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);

  const handleExcel = () => {
    window.open(`/api/group/export?groupId=${groupId}&format=excel`, "_blank");
    setOpen(false);
  };

  const handlePrint = () => {
    window.print();
    setOpen(false);
  };

  return (
    <div className="relative print:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
      >
        <Download size={16} />
        تصدير
        <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && (
        <div className="absolute start-0 top-full mt-1 z-50 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-lg overflow-hidden">
          <button onClick={handleExcel} className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--surface-muted)] transition-colors">
            <FileSpreadsheet size={16} className="text-emerald-600" />
            تصدير Excel
          </button>
          <button onClick={handlePrint} className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--surface-muted)] transition-colors">
            <Printer size={16} className="text-violet-600" />
            طباعة
          </button>
        </div>
      )}
    </div>
  );
}
