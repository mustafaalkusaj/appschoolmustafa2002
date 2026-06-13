"use client";
import { useState } from "react";
import type { TeacherRecord } from "../../../_types";

interface Props {
  teacher: TeacherRecord;
  locale: "ar" | "en";
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(locale === "ar" ? "ar-IQ-u-nu-latn" : "en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
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

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--card-border)] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-soft)] hover:bg-[var(--surface-hover)] transition-colors text-start"
      >
        <span className="font-semibold text-sm text-[var(--text-primary)]">{title}</span>
        <span className="text-[var(--text-muted)] text-lg leading-none">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--card-bg)]">
          {children}
        </div>
      )}
    </div>
  );
}

export function InfoTab({ teacher, locale }: Props) {
  const isEn = locale === "en";
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true,
    contact: true,
    document: false,
    job: true,
    finance: false,
    emergency: false,
    notes: false,
  });

  const toggle = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const genderLabel = teacher.gender === "male" ? (isEn ? "Male" : "ذكر") : teacher.gender === "female" ? (isEn ? "Female" : "أنثى") : "—";

  return (
    <div className="flex flex-col gap-3">
      <Section title={isEn ? "Personal Data" : "البيانات الشخصية"} open={openSections.personal} onToggle={() => toggle("personal")}>
        <Field label={isEn ? "Full Name" : "الاسم الكامل"} value={teacher.full_name} />
        <Field label={isEn ? "First Name (AR)" : "الاسم الأول"} value={teacher.first_name_ar} />
        <Field label={isEn ? "Last Name (AR)" : "اسم العائلة"} value={teacher.last_name_ar} />
        <Field label={isEn ? "Gender" : "الجنس"} value={genderLabel} />
        <Field label={isEn ? "Date of Birth" : "تاريخ الميلاد"} value={formatDate(teacher.date_of_birth, locale)} />
        <Field label={isEn ? "Nationality" : "الجنسية"} value={teacher.nationality} />
        <Field label={isEn ? "Marital Status" : "الحالة الاجتماعية"} value={teacher.marital_status} />
        <Field label={isEn ? "Blood Type" : "فصيلة الدم"} value={teacher.blood_type} />
      </Section>

      <Section title={isEn ? "Contact Info" : "بيانات الاتصال"} open={openSections.contact} onToggle={() => toggle("contact")}>
        <Field label={isEn ? "Phone" : "الهاتف"} value={teacher.phone} />
        <Field label={isEn ? "Secondary Phone" : "هاتف ثانوي"} value={teacher.phone_secondary} />
        <Field label={isEn ? "Email" : "البريد الإلكتروني"} value={teacher.email} />
        <Field label={isEn ? "Work Email" : "البريد الرسمي"} value={teacher.email_work} />
        <Field label={isEn ? "Address" : "العنوان"} value={teacher.address} />
        <Field label={isEn ? "City" : "المدينة"} value={teacher.city} />
      </Section>

      <Section title={isEn ? "Document Info" : "بيانات الوثيقة"} open={openSections.document} onToggle={() => toggle("document")}>
        <Field label={isEn ? "National ID" : "رقم الهوية"} value={teacher.national_id} />
        <Field label={isEn ? "National ID Expiry" : "انتهاء الهوية"} value={formatDate(teacher.national_id_expiry, locale)} />
        <Field label={isEn ? "Employee ID" : "رقم الموظف"} value={teacher.employee_id} />
      </Section>

      <Section title={isEn ? "Job Data" : "البيانات الوظيفية"} open={openSections.job} onToggle={() => toggle("job")}>
        <Field label={isEn ? "Job Title" : "المسمى الوظيفي"} value={teacher.job_title} />
        <Field label={isEn ? "Subject" : "المادة"} value={teacher.subject} />
        <Field label={isEn ? "Specialization" : "التخصص"} value={teacher.specialization} />
        <Field label={isEn ? "Contract Type" : "نوع العقد"} value={teacher.contract_type} />
        <Field label={isEn ? "Hire Date" : "تاريخ التوظيف"} value={formatDate(teacher.hire_date, locale)} />
        <Field label={isEn ? "Contract End" : "نهاية العقد"} value={formatDate(teacher.contract_end_date, locale)} />
        <Field label={isEn ? "Experience (yrs)" : "سنوات الخبرة"} value={teacher.years_experience} />
        <Field label={isEn ? "Max Periods/Day" : "أقصى حصص يوميًا"} value={teacher.max_periods_daily} />
        <Field label={isEn ? "Max Periods/Week" : "أقصى حصص أسبوعيًا"} value={teacher.max_periods_weekly} />
        <Field label={isEn ? "Qualification" : "المؤهل"} value={teacher.qualification} />
        <Field label={isEn ? "University" : "الجامعة"} value={teacher.university} />
        <Field label={isEn ? "Graduation Year" : "سنة التخرج"} value={teacher.graduation_year} />
      </Section>

      <Section title={isEn ? "Financial Data" : "البيانات المالية"} open={openSections.finance} onToggle={() => toggle("finance")}>
        <Field label={isEn ? "Base Salary" : "الراتب الأساسي"} value={teacher.base_salary} />
        <Field label={isEn ? "Transport Allowance" : "بدل النقل"} value={teacher.transport_allowance} />
        <Field label={isEn ? "Housing Allowance" : "بدل السكن"} value={teacher.housing_allowance} />
        <Field label={isEn ? "Other Allowances" : "بدلات أخرى"} value={teacher.other_allowances} />
        <Field label={isEn ? "Bank Name" : "اسم البنك"} value={teacher.bank_name} />
        <Field label={isEn ? "Bank Account" : "رقم الحساب"} value={teacher.bank_account} />
      </Section>

      <Section title={isEn ? "Emergency Contact" : "جهة الطوارئ"} open={openSections.emergency} onToggle={() => toggle("emergency")}>
        <Field label={isEn ? "Name" : "الاسم"} value={teacher.emergency_contact_name} />
        <Field label={isEn ? "Phone" : "الهاتف"} value={teacher.emergency_contact_phone} />
        <Field label={isEn ? "Relation" : "صلة القرابة"} value={teacher.emergency_contact_relation} />
      </Section>

      <Section title={isEn ? "Notes" : "ملاحظات"} open={openSections.notes} onToggle={() => toggle("notes")}>
        <div className="col-span-2">
          <p className="text-sm text-[var(--text-primary)]">{teacher.notes || "—"}</p>
        </div>
      </Section>
    </div>
  );
}
