import type { StudentListRow, StudentDatasetRow, StudentWithFees, PrintCardOptions, ManagedUserAccountCard, StudentCredentialTarget } from "./_types";
import { formatNumber } from "@/lib/formatting";
import { escapeHtml, wrapPrintDocument } from "@/lib/print/branding";
import { STUDENT_IMPORT_ALLOWED_EXTENSIONS, STUDENT_IMPORT_MAX_FILE_SIZE_BYTES } from "./_constants";
import { getAcademicYearLabel } from "@/lib/academic-year";

export function formatCardDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-IQ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function buildPrintableCardHtml(
  card: ManagedUserAccountCard,
  options: PrintCardOptions,
  _autoPrint = true,
) {
  const locale = options.locale;
  const classLine = [card.class_name, card.section ? `الشعبة ${card.section}` : null].filter(Boolean).join(" • ");
  const instructions = card.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join("");

  return wrapPrintDocument({
    title: locale === "en" ? "Student app account card" : "بطاقة حساب التطبيق",
    subtitle: locale === "en" ? "Managed access details" : "بيانات الدخول للطباعة الفورية",
    branding: {
      schoolName: card.school_name,
      logoUrl: card.school_logo_url,
      primaryColor: options.primaryColor,
      secondaryColor: options.secondaryColor,
      locale,
    },
    autoPrint: false,
    bodyHtml: `
      <div class="print-grid" style="margin-bottom:16px">
        <div class="print-panel">
          <span class="print-label">${locale === "en" ? "Student name" : "اسم الطالب"}</span>
          <div class="print-value">${escapeHtml(card.full_name)}</div>
        </div>
        <div class="print-panel">
          <span class="print-label">${locale === "en" ? "Class and section" : "الصف والشعبة"}</span>
          <div class="print-value">${escapeHtml(classLine || "—")}</div>
        </div>
      </div>
      <div class="print-grid" style="margin-bottom:16px">
        <div class="print-panel">
          <span class="print-label">${locale === "en" ? "Login identifier" : "معرّف الدخول"}</span>
          <div class="print-value" style="direction:ltr;text-align:left">${escapeHtml(card.login_identifier)}</div>
        </div>
        <div class="print-panel">
          <span class="print-label">${locale === "en" ? "Temporary password" : "كلمة المرور المؤقتة"}</span>
          <div class="print-value" style="direction:ltr;text-align:left">${escapeHtml(card.temporary_password)}</div>
        </div>
      </div>
      <div class="print-panel">
        <span class="print-label">${locale === "en" ? "Login instructions" : "تعليمات الدخول"}</span>
        <ol class="print-list">${instructions}</ol>
      </div>
    `,
  });
}

export function readApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as { error?: { message?: string } };
  return candidate.error?.message || fallback;
}

export function normalizeStudentSearchValue(value: string, maxLength = 80) {
  return value
    .replace(/[\u0000-\u001F\u007F,()%]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function validateStudentImportFile(file: File) {
  const normalizedName = file.name.trim().toLowerCase();
  if (!normalizedName) {
    return "اسم الملف غير صالح";
  }

  const hasAllowedExtension = STUDENT_IMPORT_ALLOWED_EXTENSIONS.some((extension) =>
    normalizedName.endsWith(extension),
  );
  if (!hasAllowedExtension) {
    return "صيغة الملف غير مدعومة. استخدم ملف xlsx فقط.";
  }

  if (file.size <= 0) {
    return "الملف فارغ";
  }

  if (file.size > STUDENT_IMPORT_MAX_FILE_SIZE_BYTES) {
    return "حجم الملف كبير جداً. الحد الأقصى 2 ميغابايت.";
  }

  return null;
}

export function mapStudentRecordToStudentWithFees(
  item: StudentListRow | StudentDatasetRow,
  fallbackSchoolId: string,
): StudentWithFees {
  const totalFee = item.total_fee ?? 0;
  const paidFee = item.paid_fee ?? 0;
  const discountValue = item.discount_value ?? 0;
  const remainingFeeRaw = "remaining_fee" in item ? item.remaining_fee : null;
  const remainingFee =
    remainingFeeRaw === null || remainingFeeRaw === undefined
      ? totalFee - paidFee - discountValue
      : remainingFeeRaw;

  return {
    id: item.id,
    school_id: ("school_id" in item && typeof item.school_id === "string" && item.school_id) ? item.school_id : fallbackSchoolId,
    auth_user_id: item.auth_user_id ?? null,
    full_name: item.full_name,
    class_name: item.class_name ?? "",
    section: item.section ?? null,
    phone: item.phone ?? null,
    address: item.address ?? null,
    total_fee: totalFee,
    paid_fee: paidFee,
    discount_value: discountValue,
    status: (item.status ?? "active") as StudentWithFees["status"],
    remaining_fee: remainingFee,
    created_at: item.created_at ?? new Date().toISOString(),
    updated_at: item.updated_at ?? null,
  };
}

export function buildStudentPrintCardHtml(
  student: StudentWithFees,
  options: { locale: "ar" | "en"; schoolName?: string; logoUrl?: string | null; primaryColor?: string | null; secondaryColor?: string | null },
) {
  const { locale } = options;
  const classLine = [
    student.class_name,
    student.section ? `${locale === "en" ? "Section" : "الشعبة"} ${student.section}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return `
    <div class="student-card" style="break-inside: avoid; margin-bottom: 2rem;">
      <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #eef4fb;">
        <div>
          <h3 style="font-size: 22px; font-weight: 900; margin: 0;">${escapeHtml(student.full_name)}</h3>
          <p style="margin: 0.3rem 0 0 0; color: #547086; font-size: 14px;">${classLine || "—"}</p>
        </div>
      </div>
      <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div class="info-box" style="border: 1px solid #e2e8f0; background: #f8fbff; border-radius: 16px; padding: 1.2rem;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">${locale === "en" ? "Address" : "العنوان"}</div>
          <div style="font-size: 16px; font-weight: 700;">${student.address || "—"}</div>
        </div>
        <div class="info-box" style="border: 1px solid #e2e8f0; background: #f8fbff; border-radius: 16px; padding: 1.2rem;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">${locale === "en" ? "Phone" : "الهاتف"}</div>
          <div style="font-size: 16px; font-weight: 700; direction: ltr;">${student.phone || "—"}</div>
        </div>
        <div class="info-box fees" style="border: 1px solid #e2e8f0; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 16px; padding: 1.2rem;">
          <div style="font-size: 13px; color: #0369a1; margin-bottom: 0.5rem; font-weight: 600;">${locale === "en" ? "Total fees" : "إجمالي الرسوم"}</div>
          <div style="font-size: 20px; font-weight: 900; color: #0c4a6e;">د.ع ${formatNumber(student.total_fee)}</div>
        </div>
        <div class="info-box paid" style="border: 1px solid #dcfce7; background: linear-gradient(135deg, #f0fdf4, #d1fae5); border-radius: 16px; padding: 1.2rem;">
          <div style="font-size: 13px; color: #166534; margin-bottom: 0.5rem; font-weight: 600;">${locale === "en" ? "Paid / remaining" : "مدفوع / متبقي"}</div>
          <div style="font-size: 18px; font-weight: 800;">
            <span style="color: #059669;">د.ع ${formatNumber(student.paid_fee)}</span> / 
            <span style="color: ${student.remaining_fee > 0 ? '#dc2626' : '#059669'}; font-weight: 900;">د.ع ${formatNumber(student.remaining_fee)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function buildSingleStudentPrintHtml(
  student: StudentWithFees,
  options: { locale: "ar" | "en"; schoolName?: string; logoUrl?: string | null; primaryColor?: string | null; secondaryColor?: string | null },
) {
  const { locale } = options;
  return wrapPrintDocument({
    title: locale === "en" ? "Student profile" : "بيانات الطالب",
    subtitle: student.full_name,
    branding: {
      schoolName: options.schoolName,
      logoUrl: options.logoUrl,
      primaryColor: options.primaryColor,
      secondaryColor: options.secondaryColor,
      locale,
    },
    autoPrint: false,
    bodyHtml: `
      <div class="print-grid">
        <div class="print-panel"><span class="print-label">${locale === "en" ? "Name" : "الاسم"}</span><div class="print-value">${escapeHtml(student.full_name)}</div></div>
        <div class="print-panel"><span class="print-label">${locale === "en" ? "Class" : "الصف"}</span><div class="print-value">${escapeHtml(student.class_name)}</div></div>
        <div class="print-panel"><span class="print-label">${locale === "en" ? "Section" : "الشعبة"}</span><div class="print-value">${escapeHtml(student.section || "—")}</div></div>
        <div class="print-panel"><span class="print-label">${locale === "en" ? "Address" : "العنوان"}</span><div class="print-value">${escapeHtml(student.address || "—")}</div></div>
        <div class="print-panel"><span class="print-label">${locale === "en" ? "Phone" : "الهاتف"}</span><div class="print-value" style="direction:ltr;text-align:left">${escapeHtml(student.phone || "—")}</div></div>
        <div class="print-panel"><span class="print-label">${locale === "en" ? "Total fees" : "إجمالي الرسوم"}</span><div class="print-value">د.ع ${formatNumber(student.total_fee)}</div></div>
        <div class="print-panel"><span class="print-label">${locale === "en" ? "Paid" : "المدفوع"}</span><div class="print-value">د.ع ${formatNumber(student.paid_fee)}</div></div>
        <div class="print-panel"><span class="print-label">${locale === "en" ? "Remaining" : "المتبقي"}</span><div class="print-value">د.ع ${formatNumber(student.remaining_fee)}</div></div>
      </div>
    `,
  });
}

export type { StudentCredentialTarget };

export interface IdCardPrintOptions {
  locale: "ar" | "en";
  schoolName?: string;
  branchName?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

/** Builds a single compact student ID card (used inside the grid). */
function buildIdCard(
  student: StudentWithFees,
  index: number,
  opts: IdCardPrintOptions,
): string {
  const { locale, schoolName, branchName, logoUrl, primaryColor } = opts;
  const primary = primaryColor || "#2563EB";
  const classLine = [student.class_name, student.section ? `${locale === "en" ? "Sec" : "ش"} ${student.section}` : null].filter(Boolean).join(" · ");
  const yearLabel = getAcademicYearLabel(new Date(), locale);
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="logo" style="width:44px;height:44px;object-fit:contain;border-radius:8px;" />`
    : `<div style="width:44px;height:44px;border-radius:8px;background:${escapeHtml(primary)};display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:900">${escapeHtml((schoolName || "م").charAt(0))}</div>`;

  return `
    <div class="id-card" style="
      break-inside:avoid;
      border:2px solid ${escapeHtml(primary)};
      border-radius:16px;
      overflow:hidden;
      font-family:'Cairo','Arial',sans-serif;
      direction:${locale === "en" ? "ltr" : "rtl"};
      background:#fff;
      box-shadow:0 2px 8px rgba(0,0,0,.08);
    ">
      <!-- Header -->
      <div style="background:${escapeHtml(primary)};padding:10px 14px;display:flex;align-items:center;gap:10px;">
        ${logoHtml}
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(schoolName || (locale === "en" ? "School" : "المدرسة"))}</div>
          ${branchName ? `<div style="font-size:10px;color:rgba(255,255,255,.85);margin-top:1px;">${escapeHtml(branchName)}</div>` : ""}
          <div style="font-size:10px;color:rgba(255,255,255,.7);margin-top:2px;">${escapeHtml(yearLabel)}</div>
        </div>
        <div style="background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:900;border-radius:20px;padding:2px 8px;white-space:nowrap;">${locale === "en" ? "#" : "رقم"} ${index + 1}</div>
      </div>
      <!-- Body -->
      <div style="padding:12px 14px 10px;">
        <div style="font-size:16px;font-weight:900;color:#0f172a;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(student.full_name)}</div>
        <div style="font-size:11px;color:#475569;font-weight:700;margin-bottom:8px;">${escapeHtml(classLine || "—")}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${student.phone ? `<div style="font-size:10px;background:#f1f5f9;border-radius:6px;padding:3px 8px;color:#334155;direction:ltr;">${escapeHtml(student.phone)}</div>` : ""}
          ${student.address ? `<div style="font-size:10px;background:#f1f5f9;border-radius:6px;padding:3px 8px;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${escapeHtml(student.address)}</div>` : ""}
        </div>
      </div>
      <!-- Footer fees strip -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);background:#f8fafc;border-top:1px solid #e2e8f0;padding:6px 8px;gap:2px;text-align:center;">
        <div>
          <div style="font-size:9px;color:#64748b;font-weight:600;">${locale === "en" ? "Total" : "الرسوم"}</div>
          <div style="font-size:11px;font-weight:800;color:#0f172a;">${formatNumber(student.total_fee)}</div>
        </div>
        <div>
          <div style="font-size:9px;color:#16a34a;font-weight:600;">${locale === "en" ? "Paid" : "المدفوع"}</div>
          <div style="font-size:11px;font-weight:800;color:#16a34a;">${formatNumber(student.paid_fee)}</div>
        </div>
        <div>
          <div style="font-size:9px;color:${Number(student.remaining_fee) > 0 ? "#dc2626" : "#16a34a"};font-weight:600;">${locale === "en" ? "Remaining" : "المتبقي"}</div>
          <div style="font-size:11px;font-weight:800;color:${Number(student.remaining_fee) > 0 ? "#dc2626" : "#16a34a"};">${formatNumber(student.remaining_fee)}</div>
        </div>
      </div>
    </div>
  `;
}

/** Wraps a grid of ID cards into a printable HTML document. 4 cards per row on A4. */
export function buildStudentIdCardsHtml(
  students: StudentWithFees[],
  opts: IdCardPrintOptions,
): string {
  const { locale, schoolName, branchName, primaryColor } = opts;
  const primary = primaryColor || "#2563EB";
  const cards = students.map((s, i) => buildIdCard(s, i, opts)).join("");
  const yearLabel = getAcademicYearLabel(new Date(), locale);
  const titleLine = [schoolName, branchName].filter(Boolean).join(" — ");

  return `<!DOCTYPE html><html dir="${locale === "en" ? "ltr" : "rtl"}"><head>
<meta charset="utf-8"/>
<title>${escapeHtml(locale === "en" ? "Student ID Cards" : "بطاقات الطلاب")}</title>
<style>
  @page { size: A4 portrait; margin: 1cm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: 'Cairo','Arial',sans-serif; background:#fff; direction:${locale === "en" ? "ltr" : "rtl"}; }
  .page-header { text-align:center; margin-bottom:16px; padding-bottom:12px; border-bottom:3px solid ${primary}; }
  .page-header h1 { font-size:18px; font-weight:900; margin:0 0 4px; color:${primary}; }
  .page-header p  { font-size:12px; color:#475569; margin:0; }
  .cards-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; }
  @media print {
    .id-card { break-inside: avoid; }
  }
</style>
</head><body>
<div class="page-header">
  <h1>${escapeHtml(locale === "en" ? "Student ID Cards" : "بطاقات الطلاب")}</h1>
  <p>${escapeHtml(titleLine || "")}${titleLine ? " · " : ""}${escapeHtml(yearLabel)} · ${students.length} ${locale === "en" ? "students" : "طالب"}</p>
</div>
<div class="cards-grid">${cards}</div>
</body></html>`;
}
