import { escapeHtml } from "./branding";

export type StyledReceiptData = {
  schoolName: string | null;
  logoUrl: string | null;
  branchName: string | null;
  primaryColor: string | null;
  /** Text/font color for content (labels, values, names). Defaults to primaryColor. */
  textColor?: string | null;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  date: string;
  notes?: string | null;
  studentName: string;
  className: string;
  totalFee: number;
  discountValue: number;
  remainingFee: number;
  isEnglish: boolean;
  /** Optional custom background image URL for the receipt card (per-branch design) */
  backgroundImageUrl?: string | null;
  /** Optional custom footer text shown at the bottom of the receipt */
  receiptFooterText?: string | null;
};

function fmt(n: number) {
  try {
    return new Intl.NumberFormat("en-US").format(n);
  } catch {
    return String(n);
  }
}

function fmtDate(d: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

// SVG watermark icons — line-art style at low opacity
const SVG_BOOKS = `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect x="15" y="78" width="85" height="16" rx="4" fill="currentColor"/>
  <rect x="22" y="62" width="72" height="18" rx="4" fill="currentColor"/>
  <rect x="29" y="46" width="60" height="18" rx="4" fill="currentColor"/>
  <line x1="42" y1="46" x2="42" y2="94" stroke="white" stroke-width="2.5"/>
  <line x1="65" y1="62" x2="65" y2="94" stroke="white" stroke-width="2.5"/>
  <path d="M88 8 C100 24,84 48,70 58 C63 64,59 66,59 66 C67 55,78 38,84 20 Z" fill="currentColor"/>
  <path d="M59 66 L54 84" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="57" cy="86" rx="12" ry="3" fill="currentColor" opacity="0.4"/>
</svg>`;

const SVG_GLOBE = `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <circle cx="60" cy="60" r="48" stroke="currentColor" stroke-width="3.5"/>
  <ellipse cx="60" cy="60" rx="24" ry="48" stroke="currentColor" stroke-width="2.5"/>
  <line x1="12" y1="60" x2="108" y2="60" stroke="currentColor" stroke-width="2.5"/>
  <line x1="18" y1="38" x2="102" y2="38" stroke="currentColor" stroke-width="1.8"/>
  <line x1="18" y1="82" x2="102" y2="82" stroke="currentColor" stroke-width="1.8"/>
  <rect x="46" y="108" width="28" height="7" rx="3.5" fill="currentColor"/>
  <rect x="40" y="113" width="40" height="5" rx="2.5" fill="currentColor"/>
</svg>`;

const SVG_BUILDING = `<svg viewBox="0 0 160 180" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <polygon points="0,55 80,6 160,55" fill="currentColor"/>
  <rect x="8" y="53" width="144" height="120" fill="currentColor"/>
  <rect x="18" y="70" width="16" height="103" fill="white" opacity="0.35"/>
  <rect x="46" y="70" width="16" height="103" fill="white" opacity="0.35"/>
  <rect x="98" y="70" width="16" height="103" fill="white" opacity="0.35"/>
  <rect x="126" y="70" width="16" height="103" fill="white" opacity="0.35"/>
  <rect x="58" y="118" width="44" height="55" rx="22" fill="white" opacity="0.45"/>
  <rect x="34" y="44" width="14" height="22" rx="3" fill="white" opacity="0.55"/>
  <rect x="112" y="44" width="14" height="22" rx="3" fill="white" opacity="0.55"/>
  <rect x="65" y="44" width="12" height="14" rx="2" fill="white" opacity="0.45"/>
  <rect x="83" y="44" width="12" height="14" rx="2" fill="white" opacity="0.45"/>
</svg>`;

export function buildStyledReceiptHtml(data: StyledReceiptData): string {
  const primary = data.primaryColor || "#1B2B72";
  const text = data.textColor || primary;
  const dir = data.isEnglish ? "ltr" : "rtl";
  const lang = data.isEnglish ? "en" : "ar";

  const {
    schoolName,
    logoUrl,
    branchName,
    receiptNumber,
    amount,
    paymentMethod,
    date,
    notes,
    studentName,
    className,
    totalFee,
    discountValue,
    remainingFee,
    isEnglish,
    backgroundImageUrl,
    receiptFooterText,
  } = data;

  const methodMap: Record<string, string> = {
    cash: isEnglish ? "Cash" : "نقداً",
    bank_transfer: isEnglish ? "Bank transfer" : "تحويل بنكي",
    check: isEnglish ? "Check" : "شيك",
  };
  const methodLabel = methodMap[paymentMethod] || paymentMethod;

  // Logo: img element with fallback div (fallback hidden by default, shown on error)
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="logo" class="school-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="school-logo logo-fallback" style="display:none">${escapeHtml((schoolName || "م").charAt(0))}</div>`
    : `<div class="school-logo logo-fallback">${escapeHtml((schoolName || "م").charAt(0))}</div>`;

  const ornamentLine = `<div class="ornament-line"><div class="ornament-rule"></div><span class="ornament-gem">❖</span><div class="ornament-rule"></div></div>`;

  const remainingColor = remainingFee <= 0 ? "#16a34a" : "#dc2626";
  const effectiveFee = Math.max(totalFee - discountValue, 0);
  const currency = isEnglish ? "IQD" : "د.ع";

  // Background image style for custom branch design
  const bgImageStyle = backgroundImageUrl
    ? `background-image:url(${escapeHtml(backgroundImageUrl)});background-size:cover;background-position:center;background-repeat:no-repeat;`
    : "";

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
<meta charset="utf-8"/>
<title>${isEnglish ? "Payment Receipt" : "إيصال دفعة"}</title>
<style>
@font-face{font-family:"Noto Sans Arabic";src:url("/fonts/noto-sans-arabic/NotoSansArabic-Variable.ttf") format("truetype");font-style:normal;font-weight:100 900;font-display:swap;}
*{box-sizing:border-box;margin:0;padding:0;}
body{
  background:#E8EAF4;
  font-family:"Noto Sans Arabic",Segoe UI,Tahoma,Arial,sans-serif;
  display:flex;justify-content:center;align-items:flex-start;
  min-height:100vh;padding:20px 12px;
  color:${text};
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
  direction:${dir};
}
.receipt{
  position:relative;
  width:100%;max-width:480px;
  background:#F5F6FC;
  ${bgImageStyle}
  border:1.5px solid ${primary}30;
  border-radius:14px;
  overflow:hidden;
  padding:20px 18px 16px;
}
/* Overlay for custom bg image readability */
${backgroundImageUrl ? `.receipt::before{content:'';position:absolute;inset:0;background:rgba(255,255,255,0.82);z-index:0;pointer-events:none;}
.receipt>*{position:relative;z-index:1;}` : ""}
/* Watermarks */
.wm{
  position:absolute;
  color:${primary};
  opacity:0.07;
  pointer-events:none;
  z-index:0;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
/* Ribbon badge */
.ribbon{
  position:absolute;
  top:0;
  ${dir === "rtl" ? "right" : "left"}:18px;
  background:${primary};
  color:white;
  font-size:13px;
  font-weight:900;
  padding:8px 16px 16px;
  clip-path:polygon(0 0,100% 0,100% 78%,50% 100%,0 78%);
  text-align:center;
  letter-spacing:1px;
  min-width:60px;
  line-height:1.4;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.ribbon-dots{font-size:8px;opacity:0.7;margin-top:2px;letter-spacing:3px;}
/* School header */
.school-header{
  text-align:center;
  display:flex;flex-direction:column;align-items:center;
  gap:7px;padding-bottom:10px;
  padding-top:2px;
}
.school-logo{
  width:64px;height:64px;
  border-radius:50%;
  object-fit:contain;
  border:2px solid ${primary}30;
  background:white;
  display:block;
}
.logo-fallback{
  display:flex;
  align-items:center;justify-content:center;
  font-size:26px;font-weight:900;
  color:${primary};
  background:white;
}
.school-name{font-size:18px;font-weight:900;letter-spacing:0.3px;text-align:center;color:${text};}
.branch-name{font-size:12px;opacity:0.55;margin-top:1px;text-align:center;}
.receipt-num{font-size:10.5px;opacity:0.5;letter-spacing:0.3px;margin-top:1px;text-align:center;}
/* Ornaments */
.ornament-line{
  display:flex;align-items:center;gap:8px;
  margin:10px 0;
  color:${primary};opacity:0.3;
}
.ornament-rule{flex:1;height:1px;background:currentColor;}
.ornament-gem{font-size:12px;}
/* Info grid */
.info-grid{
  border:1.5px solid ${primary}25;
  border-radius:10px;
  overflow:hidden;
  background:white;
  margin-bottom:10px;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.info-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  border-bottom:1px solid ${primary}12;
}
.info-row:last-child{border-bottom:none;}
.info-cell{padding:8px 12px;text-align:start;}
.info-cell+.info-cell{border-inline-start:1px solid ${primary}12;}
.cell-label{
  font-size:10px;
  opacity:0.5;
  margin-bottom:4px;
}
.cell-value{font-size:14px;font-weight:800;text-align:start;color:${text};}
/* Amount box */
.amount-box{
  border:1.5px solid ${primary}35;
  border-radius:10px;
  padding:14px 12px;
  text-align:center;
  margin-bottom:10px;
  background:white;
  position:relative;
  overflow:hidden;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.amount-bg{
  position:absolute;inset:0;
  background-image:
    radial-gradient(circle at 50% 50%, transparent 40%, ${primary}06 41%, transparent 55%),
    radial-gradient(circle at 0% 0%, transparent 40%, ${primary}04 41%, transparent 55%),
    radial-gradient(circle at 100% 0%, transparent 40%, ${primary}04 41%, transparent 55%),
    radial-gradient(circle at 0% 100%, transparent 40%, ${primary}04 41%, transparent 55%),
    radial-gradient(circle at 100% 100%, transparent 40%, ${primary}04 41%, transparent 55%);
  background-size:50px 50px, 50px 50px, 50px 50px, 50px 50px, 50px 50px;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.amount-inner{position:relative;z-index:1;}
.amount-label{font-size:11px;opacity:0.55;margin-bottom:6px;}
.amount-value{font-size:36px;font-weight:900;letter-spacing:-1px;line-height:1;color:${text};}
/* Footer */
.system-note{
  border:1px solid ${primary}20;
  border-radius:16px;
  padding:5px 14px;
  text-align:center;
  font-size:10.5px;
  opacity:0.55;
  margin-bottom:10px;
  background:white;
}
.receipt-footer-text{
  border:1px solid ${primary}18;
  border-radius:16px;
  padding:5px 14px;
  text-align:center;
  font-size:11px;
  font-weight:700;
  opacity:0.7;
  margin-bottom:10px;
  background:white;
  color:${text};
}
.notes-box{
  border:1px dashed ${primary}25;
  border-radius:8px;
  padding:7px 12px;
  margin-bottom:10px;
  font-size:12px;
  opacity:0.65;
  background:white;
  text-align:start;
}
/* Bottom section */
.bottom-section{
  position:relative;
  padding-top:4px;
  text-align:center;
}
.thanks-wrap{
  display:flex;flex-direction:column;align-items:center;gap:3px;
}
.thanks-icon{font-size:18px;}
.thanks-text{font-size:17px;font-weight:900;letter-spacing:0.5px;color:${text};}
/* Print */
@media print{
  @page{size:A5 portrait;margin:0.6cm;}
  html,body{
    width:100%;height:100%;
    background:white!important;
    padding:0!important;
    margin:0!important;
    display:block!important;
    min-height:auto!important;
  }
  .receipt{
    width:100%!important;
    max-width:none!important;
    border:none!important;
    border-radius:0!important;
    background:#F5F6FC!important;
    padding:12px 14px 10px!important;
    -webkit-print-color-adjust:exact!important;
    print-color-adjust:exact!important;
    page-break-inside:avoid;
  }
  .wm{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .ribbon{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .amount-box{background:white!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .amount-bg{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .info-grid{background:white!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .system-note{background:white!important;}
  .notes-box{background:white!important;}
}
</style>
</head>
<body>
<div class="receipt">

  <!-- Watermark: Building (top-end) -->
  <div class="wm" style="${dir === "rtl" ? "left" : "right"}:-6px;top:-6px;width:110px;height:124px;">
    ${SVG_BUILDING}
  </div>

  <!-- Ribbon badge -->
  <div class="ribbon">
    ${isEnglish ? "Receipt" : "إيصال"}
    <div class="ribbon-dots">✦ ✦ ✦</div>
  </div>

  <!-- School header -->
  <div class="school-header">
    ${logoHtml}
    <div>
      <div class="school-name">${escapeHtml(schoolName || (isEnglish ? "School" : "المدرسة"))}</div>
      ${branchName ? `<div class="branch-name">${escapeHtml(branchName)}</div>` : ""}
    </div>
    <div class="receipt-num">${isEnglish ? "Receipt no." : "رقم الإيصال"}: ${escapeHtml(receiptNumber || "—")}</div>
  </div>

  ${ornamentLine}

  <!-- Info grid -->
  <div class="info-grid">
    <div class="info-row">
      <div class="info-cell">
        <div class="cell-label">${isEnglish ? "Student name" : "اسم الطالب"}</div>
        <div class="cell-value">${escapeHtml(studentName || "—")}</div>
      </div>
      <div class="info-cell">
        <div class="cell-label">${isEnglish ? "Class" : "الصف"}</div>
        <div class="cell-value">${escapeHtml(className || "—")}</div>
      </div>
    </div>
    <div class="info-row">
      <div class="info-cell">
        <div class="cell-label">${isEnglish ? "Date" : "التاريخ"}</div>
        <div class="cell-value">${fmtDate(date)}</div>
      </div>
      <div class="info-cell">
        <div class="cell-label">${isEnglish ? "Payment method" : "طريقة الدفع"}</div>
        <div class="cell-value">${escapeHtml(methodLabel)}</div>
      </div>
    </div>
    ${effectiveFee > 0 ? `
    <div class="info-row">
      <div class="info-cell">
        <div class="cell-label">${isEnglish ? "Total fee" : "المبلغ الكلي"}</div>
        <div class="cell-value" style="font-size:12px;">${fmt(totalFee)} ${currency}</div>
      </div>
      <div class="info-cell">
        <div class="cell-label">${isEnglish ? "Remaining" : "المتبقي"}</div>
        <div class="cell-value" style="font-size:12px;color:${remainingColor};">${fmt(remainingFee)} ${currency}</div>
      </div>
    </div>` : ""}
    ${discountValue > 0 ? `
    <div class="info-row" style="background:${primary}04;">
      <div class="info-cell">
        <div class="cell-label">${isEnglish ? "Discount" : "التخفيض"}</div>
        <div class="cell-value" style="font-size:12px;color:#d97706;">${fmt(discountValue)} ${currency}</div>
      </div>
      <div class="info-cell"></div>
    </div>` : ""}
  </div>

  <!-- Amount box -->
  <div class="amount-box">
    <div class="amount-bg"></div>
    <div class="amount-inner">
      <div class="amount-label">${isEnglish ? "Amount received" : "المبلغ المستلم"}</div>
      <div class="amount-value">${currency} ${fmt(amount)}</div>
    </div>
  </div>

  <!-- System note -->
  <div class="system-note">
    ${isEnglish ? "Receipt generated by the school management system." : "تم إنشاء الإيصال من نظام إدارة المدرسة."}
  </div>

  ${receiptFooterText ? `<div class="receipt-footer-text">${escapeHtml(receiptFooterText)}</div>` : ""}

  ${notes ? `<div class="notes-box">${escapeHtml(notes)}</div>` : ""}

  <!-- Bottom section -->
  <div class="bottom-section">
    <!-- Watermark: Books (bottom-start) -->
    <div class="wm" style="${dir === "rtl" ? "right" : "left"}:-8px;bottom:-8px;width:76px;height:76px;">
      ${SVG_BOOKS}
    </div>
    <!-- Watermark: Globe (bottom-end) -->
    <div class="wm" style="${dir === "rtl" ? "left" : "right"}:-8px;bottom:-8px;width:76px;height:76px;">
      ${SVG_GLOBE}
    </div>

    ${ornamentLine}
    <div class="thanks-wrap">
      <div class="thanks-icon">🎓</div>
      <div class="thanks-text">${isEnglish ? "Thank you" : "شكراً لكم"}</div>
    </div>
    ${ornamentLine}
  </div>

</div>
</body>
</html>`;
}
