"use client";
import { Button } from "@/components/ui/button";
import type { TeacherRecord } from "../../_types";

interface Props {
  teacher: TeacherRecord;
  canManage: boolean;
  locale: "ar" | "en";
  onEdit: () => void;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    active:    { label: "نشط",      bg: "bg-emerald-50",  text: "text-emerald-700" },
    inactive:  { label: "غير نشط", bg: "bg-gray-100",    text: "text-gray-500"    },
    suspended: { label: "موقوف",    bg: "bg-red-50",      text: "text-red-600"     },
    deleted:   { label: "محذوف",    bg: "bg-red-50",      text: "text-red-600"     },
  };
  const s = map[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-500" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border border-current/20 ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function AppStatusBadge({ status }: { status: string | null }) {
  if (!status || status === "inactive") return null;
  const map: Record<string, { label: string; bg: string; text: string }> = {
    active:    { label: "حساب نشط", bg: "bg-blue-50",    text: "text-blue-700"   },
    suspended: { label: "موقوف",    bg: "bg-orange-50",  text: "text-orange-700" },
  };
  const s = map[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-500" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border border-current/20 ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export function TeacherProfileHeader({ teacher, canManage, locale, onEdit }: Props) {
  const isEn = locale === "en";
  const initials = getInitials(teacher.full_name);

  const hireDateFormatted = teacher.hire_date
    ? new Date(teacher.hire_date).toLocaleDateString(isEn ? "en-US" : "ar-IQ-u-nu-latn", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const stats = [
    teacher.years_experience != null && {
      label: isEn ? "Experience" : "الخبرة",
      value: `${teacher.years_experience} ${isEn ? "yrs" : "سنة"}`,
    },
    teacher.contract_type && {
      label: isEn ? "Contract" : "نوع العقد",
      value: teacher.contract_type,
    },
    hireDateFormatted && {
      label: isEn ? "Hire Date" : "تاريخ التوظيف",
      value: hireDateFormatted,
    },
    teacher.qualification && {
      label: isEn ? "Qualification" : "المؤهل العلمي",
      value: teacher.qualification,
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {teacher.photo ? (
            <img
              src={teacher.photo}
              alt={teacher.full_name}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[var(--card-bg)] shadow-md"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black select-none shadow-md ring-4 ring-[var(--card-bg)]"
              style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #7c3aed))" }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl font-black text-[var(--text-primary)]">{teacher.full_name}</h2>
            <StatusBadge status={teacher.status} />
            <AppStatusBadge status={teacher.app_status} />
            {teacher.employee_id && (
              <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-xs text-[var(--text-muted)] font-mono">
                #{teacher.employee_id}
              </span>
            )}
          </div>

          {(teacher.job_title || teacher.subject) && (
            <p className="text-[var(--text-secondary)] text-sm mb-3 font-medium">
              {[teacher.job_title, teacher.subject].filter(Boolean).join(" · ")}
            </p>
          )}

          {stats.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">{s.label}</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit button */}
        {canManage && (
          <div className="flex-shrink-0 self-start sm:self-center">
            <Button variant="outline" size="sm" onClick={onEdit}>
              {isEn ? "Edit" : "تعديل"}
            </Button>
          </div>
        )}
      </div>
  );
}
