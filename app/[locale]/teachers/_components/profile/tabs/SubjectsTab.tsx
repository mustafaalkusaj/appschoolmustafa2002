"use client";
import type { TeacherRecord } from "../../../_types";

interface Props {
  teacher: TeacherRecord;
  canManage: boolean;
  locale: "ar" | "en";
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value != null && value !== "" ? String(value) : "—";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-sm text-[var(--text-primary)] font-medium">{display}</span>
    </div>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {children}
    </div>
  );
}

const CONTRACT_TYPE_AR: Record<string, string> = {
  full_time: "دوام كامل",
  part_time: "دوام جزئي",
  substitute: "بديل",
  volunteer: "متطوع",
};

const CONTRACT_TYPE_EN: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  substitute: "Substitute",
  volunteer: "Volunteer",
};

const QUALIFICATION_AR: Record<string, string> = {
  diploma: "دبلوم",
  bachelor: "بكالوريوس",
  master: "ماجستير",
  phd: "دكتوراه",
  other: "أخرى",
};

const QUALIFICATION_EN: Record<string, string> = {
  diploma: "Diploma",
  bachelor: "Bachelor",
  master: "Master",
  phd: "PhD",
  other: "Other",
};

export function SubjectsTab({ teacher, locale }: Props) {
  const isEn = locale === "en";

  const contractLabel = teacher.contract_type
    ? (isEn ? CONTRACT_TYPE_EN[teacher.contract_type] : CONTRACT_TYPE_AR[teacher.contract_type]) ?? teacher.contract_type
    : null;

  const qualificationLabel = teacher.qualification
    ? (isEn ? QUALIFICATION_EN[teacher.qualification] : QUALIFICATION_AR[teacher.qualification]) ?? teacher.qualification
    : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Main subject & specialization */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          {isEn ? "Teaching Subject" : "المادة الدراسية"}
        </h3>
        <InfoCard>
          <Field
            label={isEn ? "Main Subject" : "المادة الرئيسية"}
            value={teacher.subject}
          />
          <Field
            label={isEn ? "Specialization" : "التخصص"}
            value={teacher.specialization}
          />
          <Field
            label={isEn ? "Qualification" : "المؤهل العلمي"}
            value={qualificationLabel}
          />
          <Field
            label={isEn ? "University" : "الجامعة"}
            value={teacher.university}
          />
          <Field
            label={isEn ? "Graduation Year" : "سنة التخرج"}
            value={teacher.graduation_year}
          />
          <Field
            label={isEn ? "Years of Experience" : "سنوات الخبرة"}
            value={teacher.years_experience != null ? (isEn ? `${teacher.years_experience} yrs` : `${teacher.years_experience} سنوات`) : null}
          />
        </InfoCard>
      </div>

      {/* Teaching load */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          {isEn ? "Teaching Load" : "العبء التدريسي"}
        </h3>
        <InfoCard>
          <Field
            label={isEn ? "Max Periods / Day" : "أقصى حصص يوميًا"}
            value={teacher.max_periods_daily}
          />
          <Field
            label={isEn ? "Max Periods / Week" : "أقصى حصص أسبوعيًا"}
            value={teacher.max_periods_weekly}
          />
          <Field
            label={isEn ? "Job Title" : "المسمى الوظيفي"}
            value={teacher.job_title}
          />
          <Field
            label={isEn ? "Contract Type" : "نوع العقد"}
            value={contractLabel}
          />
        </InfoCard>
      </div>

      {/* Classes taught placeholder */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          {isEn ? "Assigned Classes" : "الصفوف المخصصة"}
        </h3>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-8 flex flex-col items-center gap-2 text-[var(--text-muted)]">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <p className="text-sm text-center">
            {isEn
              ? "Class assignments will appear here once configured."
              : "ستظهر الصفوف المخصصة هنا بعد ربط الجداول."}
          </p>
        </div>
      </div>
    </div>
  );
}
