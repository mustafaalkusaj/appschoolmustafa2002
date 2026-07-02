"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import type { TeacherRecord, TeacherFormData } from "../_types";
import { EMPTY_TEACHER_FORM } from "../_types";
import dynamic from "next/dynamic";

const QRPhotoUpload = dynamic(
  () => import("@/components/ui/QRPhotoUpload").then((m) => m.QRPhotoUpload),
  { ssr: false },
);

interface ClassOption { id: string; name: string }
interface SectionOption { id: string; name: string; class_id: string }

interface Props {
  show: boolean;
  editing: TeacherRecord | null;
  loading: boolean;
  error: string;
  onConfirm: (form: TeacherFormData & { photo?: string }) => void;
  onClose: () => void;
  locale: "ar" | "en";
  schoolId?: string;
}

function phoneSet(setter: (k: any, v: any) => void, key: string, raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  setter(key, digits);
}

function Field({ label, required, children, error }: { label: string; required?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
        {label}{required && <span className="text-[var(--danger)] ms-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-[var(--danger)] mt-0.5">{error}</p>}
    </div>
  );
}

const CONTRACT_TYPES = [
  { value: "full_time",   ar: "دوام كامل",  en: "Full Time" },
  { value: "part_time",   ar: "دوام جزئي",  en: "Part Time" },
  { value: "substitute",  ar: "بديل",        en: "Substitute" },
  { value: "volunteer",   ar: "متطوع",       en: "Volunteer" },
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const QUALIFICATIONS = [
  { value: "high_school", ar: "إعدادية",    en: "High School" },
  { value: "diploma",     ar: "دبلوم",      en: "Diploma" },
  { value: "bachelor",    ar: "بكالوريوس",  en: "Bachelor" },
  { value: "master",      ar: "ماجستير",    en: "Master" },
  { value: "phd",         ar: "دكتوراه",    en: "PhD" },
];

type FormWithPhoto = TeacherFormData & { photo: string };

export function TeacherFormModal({ show, editing, loading, error, onConfirm, onClose, locale, schoolId }: Props) {
  const isEn = locale === "en";
  const [form, setForm] = useState<FormWithPhoto>({ ...EMPTY_TEACHER_FORM, photo: "" });
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [activeSection, setActiveSection] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<SectionOption[]>([]);
  const [pendingClass, setPendingClass] = useState("");
  const [pendingSection, setPendingSection] = useState("");

  // Fetch classes & sections
  useEffect(() => {
    if (!show || !schoolId) return;
    fetch(`/api/web/structure?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.classes) setClassOptions(d.classes);
        if (d.sections) setSectionOptions(d.sections);
      })
      .catch(() => {});
  }, [show, schoolId]);

  useEffect(() => {
    if (show) {
      if (editing) {
        setForm({
          full_name: editing.full_name ?? "",
          first_name_ar: editing.first_name_ar ?? "",
          second_name_ar: "",
          third_name_ar: "",
          last_name_ar: editing.last_name_ar ?? "",
          first_name_en: "",
          last_name_en: "",
          subject: editing.subject ?? "",
          job_title: editing.job_title ?? "",
          specialization: editing.specialization ?? "",
          phone: editing.phone ?? "",
          phone_secondary: editing.phone_secondary ?? "",
          email: editing.email ?? "",
          email_work: editing.email_work ?? "",
          address: editing.address ?? "",
          city: editing.city ?? "",
          gender: editing.gender ?? "",
          date_of_birth: editing.date_of_birth ?? "",
          nationality: editing.nationality ?? "عراقي",
          marital_status: editing.marital_status ?? "",
          blood_type: editing.blood_type ?? "",
          national_id: editing.national_id ?? "",
          national_id_expiry: editing.national_id_expiry ?? "",
          employee_id: editing.employee_id ?? "",
          contract_type: editing.contract_type ?? "full_time",
          hire_date: editing.hire_date ?? "",
          contract_end_date: editing.contract_end_date ?? "",
          years_experience: editing.years_experience ?? 0,
          max_periods_daily: editing.max_periods_daily ?? 6,
          max_periods_weekly: editing.max_periods_weekly ?? 24,
          qualification: editing.qualification ?? "",
          university: editing.university ?? "",
          graduation_year: editing.graduation_year ?? null,
          salary_type: editing.salary_type ?? "fixed",
          lecture_price: editing.lecture_price ?? 0,
          base_salary: editing.base_salary ?? 0,
          transport_allowance: editing.transport_allowance ?? 0,
          housing_allowance: editing.housing_allowance ?? 0,
          other_allowances: editing.other_allowances ?? 0,
          bank_name: editing.bank_name ?? "",
          bank_account: editing.bank_account ?? "",
          emergency_contact_name: editing.emergency_contact_name ?? "",
          emergency_contact_phone: editing.emergency_contact_phone ?? "",
          emergency_contact_relation: editing.emergency_contact_relation ?? "",
          notes: editing.notes ?? "",
          status: editing.status ?? "active",
          photo: editing.photo ?? "",
          classes_taught: editing.classes_taught ?? [],
        });
        setPhotoPreview(editing.photo ?? "");
      } else {
        setForm({ ...EMPTY_TEACHER_FORM, photo: "" });
        setPhotoPreview("");
      }
      setActiveSection(0);
    }
  }, [show, editing]);

  const set = (key: keyof FormWithPhoto, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPhotoPreview(dataUrl);
      set("photo", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const inputClass =
    "w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition placeholder:text-[var(--text-muted)]";

  const sections = [
    { labelAr: "الأساسية", labelEn: "Basic" },
    { labelAr: "الاتصال",  labelEn: "Contact" },
    { labelAr: "الوظيفية", labelEn: "Work" },
    { labelAr: "المالية",  labelEn: "Finance" },
  ];

  return (
    <Modal open={show} onClose={onClose} size="lg">
      <ModalHeader
        title={editing ? (isEn ? "Edit Teacher" : "تعديل بيانات الأستاذ") : (isEn ? "Add New Teacher" : "إضافة أستاذ جديد")}
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-5">
          {error && (
            <div className="px-4 py-2.5 rounded-xl text-sm bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)] border border-[color-mix(in_srgb,var(--danger)_20%,transparent)]">
              {error}
            </div>
          )}

          {/* Photo Upload */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)]">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-center cursor-pointer hover:opacity-80 transition shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <Image src={photoPreview} alt="photo" width={80} height={80} className="w-full h-full object-cover" unoptimized />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-[var(--text-muted)]">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {isEn ? "Profile Photo" : "صورة الأستاذ"}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {isEn ? "JPG or PNG, max 5MB" : "JPG أو PNG، الحجم الأقصى 5MB"}
              </p>
              <div className="flex gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition"
                >
                  {isEn ? "Upload Photo" : "رفع صورة"}
                </button>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => { setPhotoPreview(""); set("photo", ""); }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition"
                  >
                    {isEn ? "Remove" : "حذف"}
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
              {/* QR capture button */}
              <button
                type="button"
                onClick={() => setShowQR(true)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                {isEn ? "Capture from Phone" : "التقاط من الهاتف"}
              </button>
              {schoolId && (
                <QRPhotoUpload
                  open={showQR}
                  schoolId={schoolId}
                  onPhotoUploaded={(url) => {
                    setPhotoPreview(url);
                    set("photo", url);
                    setShowQR(false);
                  }}
                  onCancel={() => setShowQR(false)}
                />
              )}
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-0 border-b border-[var(--border)]">
            {sections.map((sec, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSection(idx)}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  activeSection === idx
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {isEn ? sec.labelEn : sec.labelAr}
                {activeSection === idx && (
                  <span className="absolute bottom-0 start-0 end-0 h-0.5 bg-[var(--primary)] rounded-t" />
                )}
              </button>
            ))}
          </div>

          {/* Section 0: Basic Info */}
          {activeSection === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={isEn ? "Full Name (Arabic)" : "الاسم الكامل (عربي)"} required>
                <input className={inputClass} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder={isEn ? "e.g. Ahmed Mohammed Ali" : "مثال: أحمد محمد علي"} />
              </Field>
              <Field label={isEn ? "Employee ID" : "الرقم الوظيفي"}>
                <input className={inputClass} value={form.employee_id} onChange={(e) => set("employee_id", e.target.value)} placeholder="T-001" dir="ltr" />
              </Field>
              <Field label={isEn ? "Subject" : "المادة الدراسية"}>
                <input className={inputClass} value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder={isEn ? "e.g. Mathematics" : "مثال: الرياضيات"} />
              </Field>
              <Field label={isEn ? "Job Title" : "المسمى الوظيفي"}>
                <input className={inputClass} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder={isEn ? "e.g. Senior Teacher" : "مثال: أستاذ أول"} />
              </Field>
              <Field label={isEn ? "Specialization" : "التخصص"}>
                <input className={inputClass} value={form.specialization} onChange={(e) => set("specialization", e.target.value)} />
              </Field>
              <Field label={isEn ? "Gender" : "الجنس"}>
                <select className={inputClass} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">{isEn ? "Select..." : "اختر..."}</option>
                  <option value="male">{isEn ? "Male" : "ذكر"}</option>
                  <option value="female">{isEn ? "Female" : "أنثى"}</option>
                </select>
              </Field>
              <Field label={isEn ? "Date of Birth" : "تاريخ الميلاد"}>
                <DatePicker value={form.date_of_birth || undefined} onChange={(v) => set("date_of_birth", v ?? "")} />
              </Field>
              <Field label={isEn ? "Nationality" : "الجنسية"}>
                <input className={inputClass} value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
              </Field>
              <Field label={isEn ? "Marital Status" : "الحالة الاجتماعية"}>
                <select className={inputClass} value={form.marital_status} onChange={(e) => set("marital_status", e.target.value)}>
                  <option value="">{isEn ? "Select..." : "اختر..."}</option>
                  <option value="single">{isEn ? "Single" : "أعزب"}</option>
                  <option value="married">{isEn ? "Married" : "متزوج"}</option>
                  <option value="divorced">{isEn ? "Divorced" : "مطلق"}</option>
                  <option value="widowed">{isEn ? "Widowed" : "أرمل"}</option>
                </select>
              </Field>
              <Field label={isEn ? "Blood Type" : "فصيلة الدم"}>
                <select dir="ltr" className={inputClass} value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)}>
                  <option value="">{isEn ? "Select..." : "اختر..."}</option>
                  {BLOOD_TYPES.map((b) => <option key={b} value={b}>{"‎" + b}</option>)}
                </select>
              </Field>
              <Field label={isEn ? "Status" : "الحالة"}>
                <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="active">{isEn ? "Active" : "فعّال"}</option>
                  <option value="on_leave">{isEn ? "On Leave" : "في إجازة"}</option>
                  <option value="suspended">{isEn ? "Suspended" : "موقوف"}</option>
                  <option value="resigned">{isEn ? "Resigned" : "مستقيل"}</option>
                </select>
              </Field>

              {/* Classes & Sections multi-select */}
              <div className="sm:col-span-2 pt-3 border-t border-[var(--border)]">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                  {isEn ? "Assigned Classes & Sections" : "الصفوف والشُعب المسندة"}
                </p>

                {/* Existing assignments */}
                {form.classes_taught.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {form.classes_taught.map((ct, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_20%,transparent)]"
                      >
                        {ct.className}{ct.section ? ` - ${ct.section}` : ""}
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...form.classes_taught];
                            next.splice(idx, 1);
                            set("classes_taught", next);
                          }}
                          className="hover:text-[var(--danger)] transition"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add new assignment */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] text-[var(--text-muted)] mb-1 block">{isEn ? "Class" : "الصف"}</label>
                    <select
                      className={inputClass}
                      value={pendingClass}
                      onChange={(e) => { setPendingClass(e.target.value); setPendingSection(""); }}
                    >
                      <option value="">{isEn ? "Select class..." : "اختر الصف..."}</option>
                      {classOptions.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[var(--text-muted)] mb-1 block">{isEn ? "Section" : "الشعبة"}</label>
                    <select
                      className={inputClass}
                      value={pendingSection}
                      onChange={(e) => setPendingSection(e.target.value)}
                    >
                      <option value="">{isEn ? "No section" : "بدون شعبة"}</option>
                      {sectionOptions
                        .filter((s) => {
                          const selectedClass = classOptions.find((c) => c.name === pendingClass);
                          return selectedClass && s.class_id === selectedClass.id;
                        })
                        .map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!pendingClass}
                    onClick={() => {
                      if (!pendingClass) return;
                      const exists = form.classes_taught.some(
                        (ct) => ct.className === pendingClass && ct.section === pendingSection
                      );
                      if (!exists) {
                        set("classes_taught", [...form.classes_taught, { className: pendingClass, section: pendingSection }]);
                      }
                      setPendingClass("");
                      setPendingSection("");
                    }}
                    className="px-3 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white disabled:opacity-40 hover:opacity-90 transition shrink-0"
                  >
                    {isEn ? "+ Add" : "+ أضف"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Contact */}
          {activeSection === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={isEn ? "Phone" : "رقم الهاتف"} required error={form.phone && form.phone.length > 0 && form.phone.length !== 11 ? (isEn ? "Must be 11 digits" : "يجب أن يكون 11 رقم") : undefined}>
                <input className={inputClass} value={form.phone} onChange={(e) => phoneSet(set, "phone", e.target.value)} dir="ltr" placeholder="07XX XXX XXXX" inputMode="numeric" />
              </Field>
              <Field label={isEn ? "Secondary Phone" : "هاتف ثانوي"} error={form.phone_secondary && form.phone_secondary.length > 0 && form.phone_secondary.length !== 11 ? (isEn ? "Must be 11 digits" : "يجب أن يكون 11 رقم") : undefined}>
                <input className={inputClass} value={form.phone_secondary} onChange={(e) => phoneSet(set, "phone_secondary", e.target.value)} dir="ltr" inputMode="numeric" />
              </Field>
              <Field label={isEn ? "Personal Email" : "البريد الشخصي"}>
                <input className={inputClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} dir="ltr" />
              </Field>
              <Field label={isEn ? "Work Email" : "البريد الرسمي"}>
                <input className={inputClass} type="email" value={form.email_work} onChange={(e) => set("email_work", e.target.value)} dir="ltr" />
              </Field>
              <Field label={isEn ? "City" : "المدينة"}>
                <input className={inputClass} value={form.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label={isEn ? "Address" : "العنوان"}>
                <input className={inputClass} value={form.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field label={isEn ? "National ID" : "رقم الهوية"}>
                <input className={inputClass} value={form.national_id} onChange={(e) => set("national_id", e.target.value)} dir="ltr" />
              </Field>
              <Field label={isEn ? "ID Expiry" : "انتهاء الهوية"}>
                <DatePicker value={form.national_id_expiry || undefined} onChange={(v) => set("national_id_expiry", v ?? "")} />
              </Field>
              <div className="sm:col-span-2 pt-2 border-t border-[var(--border)]">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">{isEn ? "Emergency Contact" : "جهة الطوارئ"}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label={isEn ? "Name" : "الاسم"}>
                    <input className={inputClass} value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
                  </Field>
                  <Field label={isEn ? "Phone" : "الهاتف"} error={form.emergency_contact_phone && form.emergency_contact_phone.length > 0 && form.emergency_contact_phone.length !== 11 ? (isEn ? "Must be 11 digits" : "يجب أن يكون 11 رقم") : undefined}>
                    <input className={inputClass} value={form.emergency_contact_phone} onChange={(e) => phoneSet(set, "emergency_contact_phone", e.target.value)} dir="ltr" inputMode="numeric" />
                  </Field>
                  <Field label={isEn ? "Relation" : "العلاقة"}>
                    <input className={inputClass} value={form.emergency_contact_relation} onChange={(e) => set("emergency_contact_relation", e.target.value)} placeholder={isEn ? "e.g. Brother" : "أخ، والد..."} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Work */}
          {activeSection === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={isEn ? "Contract Type" : "نوع العقد"}>
                <select className={inputClass} value={form.contract_type} onChange={(e) => set("contract_type", e.target.value)}>
                  {CONTRACT_TYPES.map((c) => <option key={c.value} value={c.value}>{isEn ? c.en : c.ar}</option>)}
                </select>
              </Field>
              <Field label={isEn ? "Hire Date" : "تاريخ التعيين"}>
                <DatePicker value={form.hire_date || undefined} onChange={(v) => set("hire_date", v ?? "")} />
              </Field>
              <Field label={isEn ? "Contract End" : "نهاية العقد"}>
                <DatePicker value={form.contract_end_date || undefined} onChange={(v) => set("contract_end_date", v ?? "")} />
              </Field>
              <Field label={isEn ? "Years of Experience" : "سنوات الخبرة"}>
                <input className={inputClass} type="number" min={0} value={form.years_experience || ""} onChange={(e) => set("years_experience", Number(e.target.value))} />
              </Field>
              <Field label={isEn ? "Qualification" : "المؤهل العلمي"}>
                <select className={inputClass} value={form.qualification} onChange={(e) => set("qualification", e.target.value)}>
                  <option value="">{isEn ? "Select..." : "اختر..."}</option>
                  {QUALIFICATIONS.map((q) => <option key={q.value} value={q.value}>{isEn ? q.en : q.ar}</option>)}
                </select>
              </Field>
              <Field label={isEn ? "University" : "الجامعة"}>
                <input className={inputClass} value={form.university} onChange={(e) => set("university", e.target.value)} />
              </Field>
              <Field label={isEn ? "Graduation Year" : "سنة التخرج"}>
                <input className={inputClass} type="number" min={1970} max={2030} value={form.graduation_year ?? ""} onChange={(e) => set("graduation_year", e.target.value ? Number(e.target.value) : null)} placeholder="2020" />
              </Field>
              <Field label={isEn ? "Max Periods / Day" : "أقصى حصص يومياً"}>
                <input className={inputClass} type="number" min={1} max={12} value={form.max_periods_daily || ""} onChange={(e) => set("max_periods_daily", Number(e.target.value))} />
              </Field>
              <Field label={isEn ? "Max Periods / Week" : "أقصى حصص أسبوعياً"}>
                <input className={inputClass} type="number" min={1} max={50} value={form.max_periods_weekly || ""} onChange={(e) => set("max_periods_weekly", Number(e.target.value))} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={isEn ? "Notes" : "ملاحظات"}>
                  <textarea className={`${inputClass} min-h-[80px] resize-none`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {/* Section 3: Finance */}
          {activeSection === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex items-start gap-3 p-4 rounded-xl bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] border border-[color-mix(in_srgb,var(--primary)_20%,transparent)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">
                    {isEn ? "Salary managed from the Salaries page" : "الرواتب تُدار من صفحة الرواتب"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {isEn
                      ? "To set salary type, base salary, allowances, and lecture prices, go to the Salaries section."
                      : "لتحديد نوع الراتب والراتب الأساسي والبدلات وأجر المحاضرة، اذهب إلى قسم الرواتب."}
                  </p>
                </div>
              </div>
              <Field label={isEn ? "Bank Name" : "اسم البنك"}>
                <input className={inputClass} value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} />
              </Field>
              <Field label={isEn ? "Account Number" : "رقم الحساب"}>
                <input className={inputClass} value={form.bank_account} onChange={(e) => set("bank_account", e.target.value)} dir="ltr" />
              </Field>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex gap-1.5 items-center">
            {sections.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSection(idx)}
                className={`rounded-full transition-all ${
                  activeSection === idx
                    ? "w-5 h-2 bg-[var(--primary)]"
                    : "w-2 h-2 bg-[var(--border)] hover:bg-[var(--text-muted)]"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            {activeSection < sections.length - 1 ? (
              <Button variant="primary" size="sm" onClick={() => setActiveSection((s) => s + 1)}>
                {isEn ? "Next →" : "→ التالي"}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onConfirm(form)}
                disabled={!form.full_name || loading || (form.phone.length > 0 && form.phone.length !== 11) || (form.phone_secondary.length > 0 && form.phone_secondary.length !== 11) || (form.emergency_contact_phone.length > 0 && form.emergency_contact_phone.length !== 11)}
                loading={loading}
              >
                {loading ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save Teacher" : "حفظ الأستاذ")}
              </Button>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}
