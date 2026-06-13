"use client";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  subjectFilter: string;
  onSubjectChange: (v: string) => void;
  subjects: string[];
  locale: "ar" | "en";
}

export function TeachersFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  subjectFilter,
  onSubjectChange,
  subjects,
  locale,
}: Props) {
  const isEn = locale === "en";
  return (
    <div className="flex flex-wrap gap-3">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={
          isEn ? "Search by name, phone..." : "بحث بالاسم أو الهاتف..."
        }
        className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      >
        <option value="">{isEn ? "All Status" : "كل الحالات"}</option>
        <option value="active">{isEn ? "Active" : "فعال"}</option>
        <option value="on_leave">{isEn ? "On Leave" : "إجازة"}</option>
        <option value="suspended">{isEn ? "Suspended" : "موقوف"}</option>
        <option value="resigned">{isEn ? "Resigned" : "مستقيل"}</option>
      </select>
      <select
        value={subjectFilter}
        onChange={(e) => onSubjectChange(e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      >
        <option value="">{isEn ? "All Subjects" : "كل المواد"}</option>
        {subjects.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
