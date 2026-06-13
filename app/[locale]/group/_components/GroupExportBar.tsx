"use client";

export function GroupExportBar() {
  return (
    <div className="flex gap-2 pb-2">
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
      >
        🖨️ طباعة / PDF
      </button>
      <a
        href="/api/web/group/export?format=excel"
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
      >
        📊 تصدير Excel
      </a>
    </div>
  );
}
