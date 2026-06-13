"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { localizeAppPath } from "@/lib/locale-routing";
import { Pencil, Trash2, Printer, Phone, GraduationCap, Users, ClipboardList } from "@/lib/icons";
import type { TeacherRecord } from "../_types";

interface Props {
  teachers: TeacherRecord[];
  loading: boolean;
  canManage: boolean;
  locale: "ar" | "en";
  onEdit: (teacher: TeacherRecord) => void;
  onDelete: (teacher: TeacherRecord) => void;
  onPrint: (teacher: TeacherRecord) => void;
  onPrintInfo: (teacher: TeacherRecord) => void;
}

const STATUS_CONFIG: Record<string, { label: string; labelAr: string; bg: string; text: string; dot: string }> = {
  active:     { label: "Active",     labelAr: "فعّال",   bg: "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]", text: "text-[var(--success)]",     dot: "bg-[var(--success)]" },
  on_leave:   { label: "On Leave",   labelAr: "إجازة",  bg: "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)]", text: "text-[var(--warning)]",     dot: "bg-[var(--warning)]" },
  suspended:  { label: "Suspended",  labelAr: "موقوف",  bg: "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",  text: "text-[var(--danger)]",      dot: "bg-[var(--danger)]" },
  resigned:   { label: "Resigned",   labelAr: "مستقيل", bg: "bg-[var(--surface-muted)]",                               text: "text-[var(--text-muted)]",  dot: "bg-[var(--text-muted)]" },
  terminated: { label: "Terminated", labelAr: "منتهي",  bg: "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",  text: "text-[var(--danger)]",      dot: "bg-[var(--danger)]" },
};

const CONTRACT_CONFIG: Record<string, { label: string; labelAr: string }> = {
  full_time:  { label: "Full-time",  labelAr: "دوام كامل" },
  part_time:  { label: "Part-time",  labelAr: "دوام جزئي" },
  substitute: { label: "Substitute", labelAr: "بديل" },
  volunteer:  { label: "Volunteer",  labelAr: "متطوع" },
};

function StatusBadge({ status, locale }: { status: string; locale: "ar" | "en" }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, labelAr: status, bg: "bg-[var(--surface-muted)]", text: "text-[var(--text-muted)]", dot: "bg-[var(--text-muted)]" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {locale === "en" ? cfg.label : cfg.labelAr}
    </span>
  );
}

function TeacherAvatar({ name, photo }: { name: string; photo?: string | null }) {
  if (photo) {
    return (
      <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 border border-[var(--border)] shadow-sm">
        <Image src={photo} alt={name} width={44} height={44} className="w-full h-full object-cover" unoptimized />
      </div>
    );
  }
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[color-mix(in_srgb,var(--primary)_55%,#6366f1)] flex items-center justify-center text-white text-sm font-bold shrink-0 select-none shadow-sm">
      {initials || "؟"}
    </div>
  );
}

export function TeachersTable({ teachers, loading, canManage, locale, onEdit, onDelete, onPrint, onPrintInfo }: Props) {
  const isEn = locale === "en";
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="divide-y divide-[var(--border)]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="w-11 h-11 rounded-2xl bg-[var(--surface-soft)] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-44 rounded-lg bg-[var(--surface-soft)] animate-pulse" />
              <div className="h-2.5 w-28 rounded-lg bg-[var(--surface-soft)] animate-pulse" />
            </div>
            <div className="h-6 w-16 rounded-full bg-[var(--surface-soft)] animate-pulse hidden sm:block" />
            <div className="h-6 w-14 rounded-full bg-[var(--surface-soft)] animate-pulse hidden md:block" />
          </div>
        ))}
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-[var(--text-muted)]">
        <div className="h-20 w-20 rounded-3xl bg-[var(--surface-muted)] flex items-center justify-center">
          <Users size={36} className="opacity-30" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-bold text-base text-[var(--text-primary)]">{isEn ? "No staff found" : "لا يوجد أساتذة"}</p>
          <p className="text-sm opacity-70">{isEn ? "Add your first teacher to get started" : "أضف أول أستاذ للبدء"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
            <th className="py-3 px-5 text-start text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              {isEn ? "Teacher" : "الأستاذ"}
            </th>
            <th className="py-3 px-4 text-start text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest hidden sm:table-cell">
              {isEn ? "Subject" : "المادة"}
            </th>
            <th className="py-3 px-4 text-start text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest hidden md:table-cell">
              {isEn ? "Phone" : "الهاتف"}
            </th>
            <th className="py-3 px-4 text-start text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest hidden lg:table-cell">
              {isEn ? "Contract" : "العقد"}
            </th>
            <th className="py-3 px-4 text-start text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest hidden xl:table-cell">
              {isEn ? "Experience" : "الخبرة"}
            </th>
            <th className="py-3 px-4 text-start text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest hidden xl:table-cell">
              {isEn ? "Salary" : "الراتب"}
            </th>
            <th className="py-3 px-4 text-start text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              {isEn ? "Status" : "الحالة"}
            </th>
            <th className="py-3 px-4 text-end text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              {isEn ? "Actions" : "إجراءات"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {teachers.map((t) => (
            <tr key={t.id} className="hover:bg-[var(--surface-soft)] transition-colors group">

              {/* Teacher */}
              <td className="py-3.5 px-5">
                <Link href={localizeAppPath(`/teachers/${t.id}`, locale)} className="flex items-center gap-3 min-w-0">
                  <TeacherAvatar name={t.full_name} photo={t.photo} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors truncate leading-tight">
                      {t.full_name}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {t.employee_id
                        ? <span className="px-1.5 py-0.5 rounded bg-[var(--surface-muted)] font-mono font-semibold">#{t.employee_id}</span>
                        : <span className="opacity-60">{isEn ? "View profile →" : "عرض الملف ←"}</span>
                      }
                    </div>
                  </div>
                </Link>
              </td>

              {/* Subject */}
              <td className="py-3.5 px-4 hidden sm:table-cell">
                {t.subject ? (
                  <div className="flex items-center gap-1.5">
                    <GraduationCap size={13} className="text-[var(--text-muted)] shrink-0" />
                    <span className="text-sm text-[var(--text-primary)] font-medium">{t.subject}</span>
                  </div>
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">—</span>
                )}
                {t.job_title && (
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 ms-5">{t.job_title}</div>
                )}
              </td>

              {/* Phone */}
              <td className="py-3.5 px-4 hidden md:table-cell" dir="ltr">
                {t.phone ? (
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-[var(--text-muted)] shrink-0" />
                    <span className="text-sm text-[var(--text-secondary)] font-medium">{t.phone}</span>
                  </div>
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">—</span>
                )}
              </td>

              {/* Contract */}
              <td className="py-3.5 px-4 hidden lg:table-cell">
                {t.contract_type ? (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] font-semibold border border-[var(--border)]">
                    {isEn
                      ? (CONTRACT_CONFIG[t.contract_type]?.label ?? t.contract_type)
                      : (CONTRACT_CONFIG[t.contract_type]?.labelAr ?? t.contract_type)}
                  </span>
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">—</span>
                )}
              </td>

              {/* Experience */}
              <td className="py-3.5 px-4 hidden xl:table-cell">
                {t.hire_date || t.years_experience ? (
                  <div>
                    {t.hire_date && (
                      <div className="text-sm text-[var(--text-primary)]">
                        {new Date(t.hire_date).toLocaleDateString("en-GB", { year: "numeric", month: "short" })}
                      </div>
                    )}
                    {t.years_experience != null && t.years_experience > 0 && (
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        {isEn ? `${t.years_experience}y experience` : `${t.years_experience} سنة خبرة`}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">—</span>
                )}
              </td>

              {/* Salary */}
              <td className="py-3.5 px-4 hidden xl:table-cell">
                {t.base_salary ? (
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      {t.base_salary.toLocaleString("en-US")}
                      <span className="text-[10px] font-normal text-[var(--text-muted)] ms-1">{isEn ? "IQD" : "د.ع"}</span>
                    </div>
                    {t.salary_type && (
                      <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        t.salary_type === "fixed"
                          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
                          : t.salary_type === "hourly"
                          ? "bg-[color-mix(in_srgb,var(--info)_12%,transparent)] text-[var(--info)]"
                          : "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]"
                      }`}>
                        {t.salary_type === "fixed" ? (isEn ? "Fixed" : "ثابت")
                          : t.salary_type === "hourly" ? (isEn ? "Lectures" : "محاضرات")
                          : (isEn ? "Mixed" : "مختلط")}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">—</span>
                )}
              </td>

              {/* Status */}
              <td className="py-3.5 px-4">
                <StatusBadge status={t.status} locale={locale} />
              </td>

              {/* Actions */}
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={() => onPrint(t)}
                    title={isEn ? "Account card" : "بطاقة حساب"}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] transition-colors"
                  >
                    <Printer size={15} />
                  </button>
                  <button
                    onClick={() => onPrintInfo(t)}
                    title={isEn ? "Print info sheet" : "طباعة المعلومات"}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[color-mix(in_srgb,var(--primary)_80%,#7c3aed)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] transition-colors"
                  >
                    <ClipboardList size={15} />
                  </button>
                  {canManage && (
                    <>
                      <button
                        onClick={() => onEdit(t)}
                        title={isEn ? "Edit" : "تعديل"}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(t)}
                        title={isEn ? "Delete" : "حذف"}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
