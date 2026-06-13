import type { StudentListRow, StudentDatasetRow, StudentWithFees, PrintCardOptions, ManagedUserAccountCard, StudentCredentialTarget } from "./_types";
import { formatNumber } from "@/lib/formatting";
import { escapeHtml, wrapPrintDocument } from "@/lib/print/branding";
import { STUDENT_IMPORT_ALLOWED_EXTENSIONS, STUDENT_IMPORT_MAX_FILE_SIZE_BYTES } from "./_constants";

export async function generateLoginQrDataUrl(
  loginIdentifier: string,
  password: string,
): Promise<string | null> {
  if (!password || password === "••••••••") return null;
  try {
    const QRCode = (await import("qrcode")).default;
    const payload = `schoolapp://login?u=${encodeURIComponent(loginIdentifier)}&p=${encodeURIComponent(password)}`;
    return await QRCode.toDataURL(payload, { width: 180, margin: 1, errorCorrectionLevel: "M" });
  } catch {
    return null;
  }
}

export function formatCardDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function buildPrintableCardHtml(
  card: ManagedUserAccountCard,
  options: PrintCardOptions,
  _autoPrint = true,
  qrDataUrl?: string | null,
) {
  const locale = options.locale;
  const dir = locale === "en" ? "ltr" : "rtl";
  const classLine = [card.class_name, card.section ? `الشعبة ${card.section}` : null].filter(Boolean).join(" • ");
  const primary = options.primaryColor || "#6c3bd5";
  const primaryDark = "#4c1d95";
  const logoUrl = card.school_logo_url ?? options.logoUrl ?? null;
  const logoFallback = (card.school_name || "م").charAt(0);
  const effectiveQr = qrDataUrl ?? card.qr_data_url ?? null;

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:contain;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.4)" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div style="display:none;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.2);align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff;border:2px solid rgba(255,255,255,0.4)">${escapeHtml(logoFallback)}</div>`
    : `<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff;border:2px solid rgba(255,255,255,0.4)">${escapeHtml(logoFallback)}</div>`;

  const qrHtml = effectiveQr
    ? `<img src="${effectiveQr}" alt="QR" style="width:120px;height:120px;border-radius:8px;border:2px solid ${primary}20" />`
    : "";

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${locale === "en" ? "en" : "ar"}">
<head>
  <meta charset="utf-8" />
  <title>${locale === "en" ? "Student Login Card" : "بطاقة دخول الطالب"}</title>
  <style>
    @font-face {
      font-family: "Noto Sans Arabic";
      src: url("/fonts/noto-sans-arabic/NotoSansArabic-Variable.ttf") format("truetype");
      font-style: normal; font-weight: 100 900; font-display: swap;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Noto Sans Arabic", "Segoe UI", Arial, sans-serif;
      background: #f1f5f9;
      direction: ${dir};
      display: flex; justify-content: center; align-items: flex-start;
      padding: 24px;
      min-height: 100vh;
    }
    .card {
      width: 400px; max-width: 100%;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      border: 1.5px solid ${primary}30;
      box-shadow: 0 8px 32px rgba(0,0,0,0.10);
    }
    .card-header {
      background: linear-gradient(135deg, ${primary}, ${primaryDark});
      padding: 20px 24px 16px;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      text-align: center;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .card-header .school-name { color: #fff; font-size: 16px; font-weight: 900; }
    .card-header .card-title { color: rgba(255,255,255,0.75); font-size: 11px; font-weight: 600; letter-spacing: 0.4px; }
    .card-body { padding: 20px 24px; }
    .info-row { margin-bottom: 12px; }
    .info-label { font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .info-value { font-size: 17px; font-weight: 800; color: #1e293b; }
    .creds-area {
      display: flex; gap: 16px; align-items: flex-start; margin-top: 16px;
      flex-direction: ${dir === "rtl" ? "row-reverse" : "row"};
    }
    .creds-text { flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .cred-block {}
    .cred-label { font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .cred-value { font-size: 22px; font-weight: 900; color: ${primary}; font-family: "Courier New", "Noto Sans Arabic", monospace; direction: ltr; letter-spacing: 1px; }
    .qr-hint { font-size: 11px; color: #94a3b8; margin-top: 12px; text-align: center; }
    .card-footer {
      padding: 10px 24px;
      background: ${primary}08;
      text-align: center;
      font-size: 11px; color: #94a3b8; font-weight: 600;
      border-top: 1px solid ${primary}12;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .no-print { text-align: center; margin-bottom: 16px; }
    .print-btn {
      padding: 10px 28px; background: ${primary}; color: #fff; border: none;
      border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit;
    }
    @media print {
      @page { size: A5 portrait; margin: 10mm; }
      body { background: #fff !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .card { box-shadow: none !important; border: 1.5px solid ${primary}40 !important; width: 100%; }
    }
  </style>
</head>
<body>
  <div>
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">${locale === "en" ? "Print" : "طباعة"}</button>
    </div>
    <div class="card">
      <div class="card-header">
        ${logoHtml}
        <div class="school-name">${escapeHtml(card.school_name)}</div>
        <div class="card-title">${locale === "en" ? "Student Login Card" : "بطاقة دخول الطالب"}</div>
      </div>
      <div class="card-body">
        <div class="info-row">
          <div class="info-label">${locale === "en" ? "Student name" : "اسم الطالب"}</div>
          <div class="info-value">${escapeHtml(card.full_name)}</div>
        </div>
        <div class="info-row">
          <div class="info-label">${locale === "en" ? "Class" : "الصف"}</div>
          <div class="info-value">${escapeHtml(classLine || "—")}</div>
        </div>
        <div class="creds-area">
          ${qrHtml ? `<div>${qrHtml}</div>` : ""}
          <div class="creds-text">
            <div class="cred-block">
              <div class="cred-label">${locale === "en" ? "Username" : "اسم المستخدم"}</div>
              <div class="cred-value">${escapeHtml(card.login_identifier)}</div>
            </div>
            <div class="cred-block">
              <div class="cred-label">${locale === "en" ? "Password" : "كلمة المرور"}</div>
              <div class="cred-value">${escapeHtml(card.temporary_password)}</div>
            </div>
          </div>
        </div>
        ${effectiveQr ? `<div class="qr-hint">${locale === "en" ? "Scan the code for quick login" : "امسح الرمز للدخول السريع"}</div>` : ""}
      </div>
      <div class="card-footer">
        ${locale === "en" ? "Keep this card completely private" : "احتفظ بهذه البطاقة بسرية تامة"}
      </div>
    </div>
  </div>
</body>
</html>`;
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
    phone2: ("phone2" in item ? (item as Record<string, unknown>).phone2 : null) as string | null,
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
    <div class="student-card print-panel" style="break-inside: avoid; margin-bottom: 2rem;">
      <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--print-surface);">
        <div>
          <h3 style="font-size: 22px; font-weight: 900; margin: 0; color: var(--print-primary-deep);">${escapeHtml(student.full_name)}</h3>
          <p style="margin: 0.3rem 0 0 0; color: var(--print-muted); font-size: 14px;">${classLine || "—"}</p>
        </div>
      </div>
      <div class="print-grid">
        <div class="print-panel">
          <span class="print-label">${locale === "en" ? "Address" : "العنوان"}</span>
          <div class="print-value">${escapeHtml(student.address || "—")}</div>
        </div>
        <div class="print-panel">
          <span class="print-label">${locale === "en" ? "Phone" : "الهاتف"}</span>
          <div class="print-value" style="direction:ltr;text-align:start">${escapeHtml(student.phone || "—")}</div>
        </div>
        <div class="print-panel" style="border-color: var(--print-primary)22; background: var(--print-surface);">
          <span class="print-label">${locale === "en" ? "Total fees" : "إجمالي الرسوم"}</span>
          <div class="print-value" style="color: var(--print-primary-deep);">د.ع ${formatNumber(student.total_fee)}</div>
        </div>
        <div class="print-panel">
          <span class="print-label">${locale === "en" ? "Paid / remaining" : "مدفوع / متبقي"}</span>
          <div class="print-value" style="font-size:15px">
            <span style="color:#16a34a">د.ع ${formatNumber(student.paid_fee)}</span> /
            <span style="color:${student.remaining_fee > 0 ? "#dc2626" : "#16a34a"}">د.ع ${formatNumber(student.remaining_fee)}</span>
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
  const primary = options.primaryColor || "#6c3bd5";
  const statusLabel = locale === "en"
    ? { active: "Active", suspended: "Suspended", transferred: "Transferred", graduated: "Graduated", deleted: "Deleted", archived: "Archived", withdrawn: "Withdrawn", failed: "Failed", pending: "Pending" }[student.status] ?? student.status
    : { active: "فعال", suspended: "موقوف", transferred: "منقول", graduated: "متخرج", deleted: "محذوف", archived: "مؤرشف", withdrawn: "منسحب", failed: "راسب", pending: "معلّق" }[student.status] ?? student.status;
  const statusColor = { active: "#16a34a", suspended: "#f59e0b", transferred: "#6366f1", graduated: "#0ea5e9", deleted: "#dc2626", archived: "#64748b", withdrawn: "#a855f7", failed: "#dc2626", pending: "#f59e0b" }[student.status] ?? "#64748b";

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
    extraStyles: `
      .sp-section {
        margin-bottom: 20px;
      }
      .sp-section-title {
        font-size: 13px;
        font-weight: 800;
        color: ${primary};
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 2px solid ${primary}20;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .sp-section-icon {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        background: ${primary}12;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }
      .sp-name-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-radius: 14px;
        background: linear-gradient(135deg, ${primary}08, ${primary}03);
        border: 1.5px solid ${primary}18;
        margin-bottom: 20px;
      }
      .sp-name-text {
        font-size: 22px;
        font-weight: 900;
        color: var(--print-primary-deep, #1e293b);
      }
      .sp-status-badge {
        font-size: 11px;
        font-weight: 800;
        padding: 4px 12px;
        border-radius: 20px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sp-fees-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .sp-fee-card {
        border-radius: 14px;
        padding: 14px 16px;
        text-align: center;
        border: 1.5px solid rgba(16,35,58,.06);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sp-fee-label {
        font-size: 11px;
        color: var(--print-muted, #64748b);
        font-weight: 700;
        margin-bottom: 4px;
      }
      .sp-fee-amount {
        font-size: 18px;
        font-weight: 900;
        direction: ltr;
      }
      @media print {
        .sp-name-banner, .sp-fee-card {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `,
    bodyHtml: `
      <!-- Student Name Banner -->
      <div class="sp-name-banner">
        <div class="sp-name-text">${escapeHtml(student.full_name)}</div>
        <span class="sp-status-badge" style="background:${statusColor}14;color:${statusColor};border:1px solid ${statusColor}30">${statusLabel}</span>
      </div>

      <!-- Academic Info -->
      <div class="sp-section">
        <div class="sp-section-title">
          <span class="sp-section-icon">🎓</span>
          ${locale === "en" ? "Academic Information" : "المعلومات الأكاديمية"}
        </div>
        <div class="print-grid">
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Class" : "الصف"}</span><div class="print-value">${escapeHtml(student.class_name || "—")}</div></div>
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Section" : "الشعبة"}</span><div class="print-value">${escapeHtml(student.section || "—")}</div></div>
        </div>
      </div>

      <!-- Contact Info -->
      <div class="sp-section">
        <div class="sp-section-title">
          <span class="sp-section-icon">📞</span>
          ${locale === "en" ? "Contact Information" : "معلومات التواصل"}
        </div>
        <div class="print-grid">
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Phone" : "الهاتف"}</span><div class="print-value" style="direction:ltr;text-align:start">${escapeHtml(student.phone || "—")}</div></div>
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Address" : "العنوان"}</span><div class="print-value">${escapeHtml(student.address || "—")}</div></div>
        </div>
      </div>

      <!-- Financial Info -->
      <div class="sp-section">
        <div class="sp-section-title">
          <span class="sp-section-icon">💰</span>
          ${locale === "en" ? "Financial Information" : "المعلومات المالية"}
        </div>
        <div class="sp-fees-grid">
          <div class="sp-fee-card" style="background:${primary}06">
            <div class="sp-fee-label">${locale === "en" ? "Total Fees" : "إجمالي الرسوم"}</div>
            <div class="sp-fee-amount" style="color:${primary}">د.ع ${formatNumber(student.total_fee)}</div>
          </div>
          <div class="sp-fee-card" style="background:#16a34a08">
            <div class="sp-fee-label">${locale === "en" ? "Paid" : "المدفوع"}</div>
            <div class="sp-fee-amount" style="color:#16a34a">د.ع ${formatNumber(student.paid_fee)}</div>
          </div>
          <div class="sp-fee-card" style="background:${student.remaining_fee > 0 ? "#dc262608" : "#16a34a08"}">
            <div class="sp-fee-label">${locale === "en" ? "Remaining" : "المتبقي"}</div>
            <div class="sp-fee-amount" style="color:${student.remaining_fee > 0 ? "#dc2626" : "#16a34a"}">د.ع ${formatNumber(student.remaining_fee)}</div>
          </div>
        </div>
      </div>
    `,
  });
}

export type { StudentCredentialTarget };

export type BulkCardItem = {
  auth_user_id: string;
  full_name: string;
  class_name: string | null;
  section: string | null;
  login_identifier: string | null;
  password: string | null;
};

export async function buildBulkLoginCardsHtml(
  cards: BulkCardItem[],
  options: {
    locale: "ar" | "en";
    schoolName?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    cardBgUrl?: string | null;
  },
): Promise<string> {
  const { locale } = options;
  const dir = locale === "en" ? "ltr" : "rtl";
  const primary = options.primaryColor || "#3b5bdb";
  const cardBgUrl = options.cardBgUrl ? escapeHtml(options.cardBgUrl) : null;
  const schoolName = escapeHtml(options.schoolName || (locale === "en" ? "School" : "المدرسة"));
  const logoUrl = options.logoUrl ? escapeHtml(options.logoUrl) : "";
  const logoFallback = (options.schoolName || "م").charAt(0);

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="" class="school-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="logo-fallback" style="display:none">${escapeHtml(logoFallback)}</div>`
    : `<div class="logo-fallback">${escapeHtml(logoFallback)}</div>`;

  // Generate QR codes for all cards in parallel
  const qrDataUrls = await Promise.all(
    cards.map((card) =>
      card.login_identifier && card.password
        ? generateLoginQrDataUrl(card.login_identifier, card.password)
        : Promise.resolve(null),
    ),
  );

  const cardHtmlItems = cards.map((card, idx) => {
    const classLine = [
      card.class_name ? escapeHtml(card.class_name) : null,
      card.section ? `${locale === "en" ? "Sec." : "ش."} ${escapeHtml(card.section)}` : null,
    ]
      .filter(Boolean)
      .join(" &bull; ");

    const loginId = card.login_identifier ? escapeHtml(card.login_identifier) : "—";
    const password = card.password ? escapeHtml(card.password) : "••••••••";
    const hasPassword = Boolean(card.password);
    const qrUrl = qrDataUrls[idx];
    const qrHtml = qrUrl
      ? `<img src="${qrUrl}" alt="QR" class="qr-img" />`
      : "";

    return `
      <div class="student-card">
        <!-- Header -->
        <div class="card-header">
          <div class="header-logo">${logoHtml}</div>
          <div class="header-school">${schoolName}</div>
          <div class="header-title">${locale === "en" ? "Student Login Card" : "بطاقة دخول الطالب"}</div>
        </div>

        <!-- Student info -->
        <div class="card-body">
          <div class="student-info">
            <div class="student-name">${escapeHtml(card.full_name)}</div>
            <div class="student-class">${classLine || "—"}</div>
          </div>

          <!-- Credentials + QR -->
          <div class="creds-area">
            ${qrHtml ? `<div class="qr-col">${qrHtml}</div>` : ""}
            <div class="creds-col">
              <div class="cred-block">
                <div class="cred-label">${locale === "en" ? "Username" : "اسم المستخدم"}</div>
                <div class="cred-value cred-ltr">${loginId}</div>
              </div>
              <div class="cred-block">
                <div class="cred-label">${locale === "en" ? "Password" : "كلمة المرور"}</div>
                <div class="cred-value cred-ltr${hasPassword ? "" : " cred-masked"}">${password}</div>
              </div>
            </div>
          </div>
          ${qrUrl ? `<div class="qr-hint">${locale === "en" ? "Scan the code for quick login" : "امسح الرمز للدخول السريع"}</div>` : ""}
        </div>

        <!-- Footer -->
        <div class="card-footer">
          <span>${locale === "en" ? "Keep this card completely private" : "احتفظ بهذه البطاقة بسرية تامة"}</span>
        </div>
      </div>
    `;
  });

  const cardsHtml = cardHtmlItems.join("\n");

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${locale === "en" ? "en" : "ar"}">
<head>
  <meta charset="utf-8" />
  <title>${locale === "en" ? "Student Login Cards" : "بطاقات دخول الطلاب"}</title>
  <style>
    @font-face {
      font-family: "Noto Sans Arabic";
      src: url("/fonts/noto-sans-arabic/NotoSansArabic-Variable.ttf") format("truetype");
      font-style: normal; font-weight: 100 900; font-display: swap;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Noto Sans Arabic", "Segoe UI", Arial, sans-serif;
      background: #f1f5f9;
      direction: ${dir};
      padding: 20px;
    }
    .no-print {
      text-align: center;
      padding: 14px;
      background: #fff;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .print-btn {
      padding: 10px 28px;
      background: ${primary};
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    .count-label {
      margin-inline-start: 14px;
      font-size: 13px;
      color: #64748b;
    }
    /* Cards layout — 2 per row on screen, 1 per A5 page on print */
    .cards-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .student-card {
      background: #fff;
      ${cardBgUrl ? `background-image: url(${cardBgUrl}); background-size: cover; background-position: center;` : ""}
      border-radius: 16px;
      overflow: hidden;
      border: 1.5px solid ${primary}30;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      min-height: 240px;
      position: relative;
    }
    ${cardBgUrl ? `.student-card::before { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.82); z-index: 0; pointer-events: none; }
    .student-card > * { position: relative; z-index: 1; }` : ""}
    /* Card header */
    .card-header {
      background: linear-gradient(135deg, ${primary}, #4c1d95);
      padding: 16px 20px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-logo {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .school-logo {
      width: 52px; height: 52px;
      border-radius: 50%;
      object-fit: contain;
      background: rgba(255,255,255,0.15);
      border: 2px solid rgba(255,255,255,0.4);
    }
    .logo-fallback {
      width: 52px; height: 52px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 900; color: #fff;
      border: 2px solid rgba(255,255,255,0.4);
    }
    .header-school {
      color: #fff;
      font-size: 15px;
      font-weight: 900;
      line-height: 1.3;
    }
    .header-title {
      color: rgba(255,255,255,0.75);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.4px;
    }
    /* Card body */
    .card-body {
      flex: 1;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .student-info { margin-bottom: 4px; }
    .student-name {
      font-size: 18px;
      font-weight: 900;
      color: #1e293b;
      line-height: 1.3;
    }
    .student-class {
      font-size: 13px;
      color: #64748b;
      font-weight: 600;
    }
    .creds-area {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      flex-direction: ${dir === "rtl" ? "row-reverse" : "row"};
    }
    .qr-col { flex-shrink: 0; }
    .qr-img {
      width: 100px; height: 100px;
      border-radius: 8px;
      border: 1.5px solid ${primary}20;
    }
    .creds-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .cred-block {}
    .cred-label {
      font-size: 10px;
      color: #94a3b8;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 1px;
    }
    .cred-value {
      font-size: 18px;
      font-weight: 900;
      color: ${primary};
      font-family: "Courier New", "Noto Sans Arabic", monospace;
      letter-spacing: 1px;
      word-break: break-all;
    }
    .cred-ltr { direction: ltr; }
    .cred-masked { color: #94a3b8; letter-spacing: 2px; }
    .qr-hint {
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
    }
    /* Footer */
    .card-footer {
      padding: 8px 20px;
      background: ${primary}08;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      font-weight: 600;
      border-top: 1px solid ${primary}12;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Print */
    @media print {
      @page { size: A5 portrait; margin: 8mm; }
      body { background: #fff !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .cards-container {
        display: block;
      }
      .student-card {
        width: 100%;
        min-height: auto;
        page-break-after: always;
        break-after: page;
        box-shadow: none !important;
        border: 1.5px solid ${primary}40 !important;
        border-radius: 12px !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .student-card:last-child {
        page-break-after: avoid;
        break-after: avoid;
      }
      .card-header {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">
      ${locale === "en" ? "🖨 Print Cards" : "🖨 طباعة البطاقات"}
    </button>
    <span class="count-label">${cards.length} ${locale === "en" ? "cards" : "بطاقة"}</span>
  </div>
  <div class="cards-container">
    ${cardsHtml}
  </div>
</body>
</html>`;
}
