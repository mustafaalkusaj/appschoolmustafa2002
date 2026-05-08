import { escapeHtml } from "./branding";

export type StyledReceiptData = {
  schoolName: string | null;
  logoUrl: string | null;
  branchName: string | null;
  primaryColor: string | null;
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
};

function fmt(n: number) {
  try {
    return new Intl.NumberFormat("ar-IQ").format(n);
  } catch {
    return String(n);
  }
}

function fmtDate(d: string) {
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
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
  } = data;

  const methodMap: Record<string, string> = {
    cash: isEnglish ? "Cash" : "نقداً",
    bank_transfer: isEnglish ? "Bank transfer" : "تحويل بنكي",
    check: isEnglish ? "Check" : "شيك",
  };
  const methodLabel = methodMap[paymentMethod] || paymentMethod;

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="logo" class="school-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="school-logo logo-fallback">${escapeHtml((schoolName || "م").charAt(0))}</div>`
    : `<div class="school-logo logo-fallback">${escapeHtml((schoolName || "م").charAt(0))}</div>`;

  const ornamentLine = `<div class="ornament-line"><div class="ornament-rule"></div><span class="ornament-gem">❖</span><div class="ornament-rule"></div></div>`;
  const ornamentInline = `<span class="ornament-inline">— ❖ —</span>`;

  const remainingColor = remainingFee <= 0 ? "#16a34a" : "#dc2626";
  const effectiveFee = Math.max(totalFee - discountValue, 0);
  const currency = isEnglish ? "IQD" : "د.ع";

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
  min-height:100vh;padding:28px 16px;
  color:${primary};
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.receipt{
  position:relative;
  width:100%;max-width:500px;
  background:#F5F6FC;
  border:1.5px solid ${primary}30;
  border-radius:18px;
  overflow:hidden;
  padding:28px 22px 22px;
}
/* Watermarks */
.wm{
  position:absolute;
  color:${primary};
  opacity:0.07;
  pointer-events:none;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
/* Ribbon badge */
.ribbon{
  position:absolute;
  top:0;
  ${dir === "rtl" ? "right" : "left"}:22px;
  background:${primary};
  color:white;
  font-size:14px;
  font-weight:900;
  padding:10px 20px 20px;
  clip-path:polygon(0 0,100% 0,100% 78%,50% 100%,0 78%);
  text-align:center;
  letter-spacing:1px;
  min-width:68px;
  line-height:1.4;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.ribbon-dots{font-size:9px;opacity:0.7;margin-top:3px;letter-spacing:3px;}
/* School header */
.school-header{
  text-align:center;
  display:flex;flex-direction:column;align-items:center;
  gap:10px;padding-bottom:14px;
  padding-top:4px;
}
.school-logo{
  width:78px;height:78px;
  border-radius:50%;
  object-fit:contain;
  border:2px solid ${primary}30;
  background:white;
}
.logo-fallback{
  display:flex;
  align-items:center;justify-content:center;
  font-size:30px;font-weight:900;
  color:${primary};
  background:white;
}
.school-name{font-size:21px;font-weight:900;letter-spacing:0.3px;}
.branch-name{font-size:13px;opacity:0.55;margin-top:2px;}
.receipt-num{font-size:11px;opacity:0.5;letter-spacing:0.3px;margin-top:2px;}
/* Ornaments */
.ornament-line{
  display:flex;align-items:center;gap:10px;
  margin:14px 0;
  color:${primary};opacity:0.3;
}
.ornament-rule{flex:1;height:1px;background:currentColor;}
.ornament-gem{font-size:13px;}
.ornament-inline{font-size:11px;opacity:0.45;color:${primary};}
/* Info grid */
.info-grid{
  border:1.5px solid ${primary}25;
  border-radius:12px;
  overflow:hidden;
  background:white;
  margin-bottom:14px;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.info-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  border-bottom:1px solid ${primary}12;
}
.info-row:last-child{border-bottom:none;}
.info-cell{padding:11px 14px;}
.info-cell+.info-cell{border-inline-start:1px solid ${primary}12;}
.cell-label{
  font-size:10.5px;
  opacity:0.5;
  margin-bottom:5px;
  display:flex;align-items:center;gap:3px;
}
.cell-value{font-size:15px;font-weight:800;}
.info-row-full{
  border-bottom:1px solid ${primary}12;
  padding:10px 14px;
  display:grid;grid-template-columns:1fr 1fr;
}
.info-row-full:last-child{border-bottom:none;}
/* Amount box */
.amount-box{
  border:1.5px solid ${primary}35;
  border-radius:12px;
  padding:18px 14px;
  text-align:center;
  margin-bottom:14px;
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
  background-size:60px 60px, 60px 60px, 60px 60px, 60px 60px, 60px 60px;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.amount-inner{position:relative;z-index:1;}
.amount-label{font-size:12px;opacity:0.55;margin-bottom:8px;}
.amount-value{font-size:42px;font-weight:900;letter-spacing:-1px;line-height:1;}
/* Footer */
.system-note{
  border:1px solid ${primary}20;
  border-radius:20px;
  padding:7px 16px;
  text-align:center;
  font-size:11.5px;
  opacity:0.55;
  margin-bottom:14px;
  background:white;
}
.notes-box{
  border:1px dashed ${primary}25;
  border-radius:10px;
  padding:9px 14px;
  margin-bottom:14px;
  font-size:12.5px;
  opacity:0.65;
  background:white;
}
/* Bottom section */
.bottom-section{
  position:relative;
  padding-top:6px;
  text-align:center;
}
.thanks-wrap{
  display:flex;flex-direction:column;align-items:center;gap:4px;
}
.thanks-icon{font-size:22px;}
.thanks-text{font-size:20px;font-weight:900;letter-spacing:0.5px;}
/* Print */
@media print{
  @page{size:A5;margin:0.7cm;}
  body{
    background:white!important;
    padding:0!important;
    display:block!important;
    min-height:auto!important;
  }
  .receipt{
    max-width:none!important;
    border:none!important;
    border-radius:0!important;
    background:#F5F6FC!important;
    -webkit-print-color-adjust:exact!important;
    print-color-adjust:exact!important;
  }
  .wm{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .ribbon{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .amount-box{background:white!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .info-grid{background:white!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .system-note{background:white!important;}
  .notes-box{background:white!important;}
}
</style>
</head>
<body>
<div class="receipt">

  <!-- Watermark: Building (top-end) -->
  <div class="wm" style="${dir === "rtl" ? "left" : "right"}:-8px;top:-8px;width:130px;height:148px;">
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
        <div class="cell-label">${ornamentInline} ${isEnglish ? "Student name" : "اسم الطالب"} ${ornamentInline}</div>
        <div class="cell-value">${escapeHtml(studentName || "—")}</div>
      </div>
      <div class="info-cell">
        <div class="cell-label">${ornamentInline} ${isEnglish ? "Class" : "الصف"} ${ornamentInline}</div>
        <div class="cell-value">${escapeHtml(className || "—")}</div>
      </div>
    </div>
    <div class="info-row">
      <div class="info-cell">
        <div class="cell-label">${ornamentInline} ${isEnglish ? "Date" : "التاريخ"} ${ornamentInline}</div>
        <div class="cell-value">${fmtDate(date)}</div>
      </div>
      <div class="info-cell">
        <div class="cell-label">${ornamentInline} ${isEnglish ? "Payment method" : "طريقة الدفع"} ${ornamentInline}</div>
        <div class="cell-value">${escapeHtml(methodLabel)}</div>
      </div>
    </div>
    ${effectiveFee > 0 ? `
    <div class="info-row">
      <div class="info-cell">
        <div class="cell-label">${ornamentInline} ${isEnglish ? "Total fee" : "المبلغ الكلي"} ${ornamentInline}</div>
        <div class="cell-value" style="font-size:13px;">${fmt(totalFee)} ${currency}</div>
      </div>
      <div class="info-cell">
        <div class="cell-label">${ornamentInline} ${isEnglish ? "Remaining" : "المتبقي"} ${ornamentInline}</div>
        <div class="cell-value" style="font-size:13px;color:${remainingColor};">${fmt(remainingFee)} ${currency}</div>
      </div>
    </div>` : ""}
    ${discountValue > 0 ? `
    <div class="info-row" style="background:${primary}04;">
      <div class="info-cell">
        <div class="cell-label">${ornamentInline} ${isEnglish ? "Discount" : "التخفيض"} ${ornamentInline}</div>
        <div class="cell-value" style="font-size:13px;color:#d97706;">${fmt(discountValue)} ${currency}</div>
      </div>
      <div class="info-cell"></div>
    </div>` : ""}
  </div>

  <!-- Amount box -->
  <div class="amount-box">
    <div class="amount-bg"></div>
    <div class="amount-inner">
      <div class="amount-label">${ornamentInline} ${isEnglish ? "Amount received" : "المبلغ المستلم"} ${ornamentInline}</div>
      <div class="amount-value">${currency} ${fmt(amount)}</div>
    </div>
  </div>

  <!-- System note -->
  <div class="system-note">
    ${isEnglish ? "Receipt generated by the school management system." : "تم إنشاء الإيصال من نظام إدارة المدرسة."}
  </div>

  ${notes ? `<div class="notes-box">${escapeHtml(notes)}</div>` : ""}

  <!-- Bottom section -->
  <div class="bottom-section">
    <!-- Watermark: Books (bottom-start) -->
    <div class="wm" style="${dir === "rtl" ? "right" : "left"}:-10px;bottom:-10px;width:90px;height:90px;">
      ${SVG_BOOKS}
    </div>
    <!-- Watermark: Globe (bottom-end) -->
    <div class="wm" style="${dir === "rtl" ? "left" : "right"}:-10px;bottom:-10px;width:90px;height:90px;">
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
