import { DEFAULT_PRIMARY, DEFAULT_SECONDARY, resolveBrandPalette, sanitizeColor } from "@/lib/brand-palette";

export type PrintBranding = {
  schoolName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  locale?: "ar" | "en";
};

function escapeHtml(input: string | null | undefined) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function wrapPrintDocument(input: {
  title: string;
  subtitle?: string | null;
  bodyHtml: string;
  branding?: PrintBranding;
  extraStyles?: string;
  autoPrint?: boolean;
}) {
  const locale = input.branding?.locale === "en" ? "en" : "ar";
  const direction = locale === "en" ? "ltr" : "rtl";
  const palette = resolveBrandPalette({
    primaryColor: sanitizeColor(input.branding?.primaryColor) || DEFAULT_PRIMARY,
    secondaryColor: sanitizeColor(input.branding?.secondaryColor) || DEFAULT_SECONDARY,
  });
  const schoolName = escapeHtml(input.branding?.schoolName || (locale === "en" ? "School" : "المدرسة"));
  const title = escapeHtml(input.title);
  const subtitle = escapeHtml(input.subtitle || "");
  const logoUrl = input.branding?.logoUrl ? escapeHtml(input.branding.logoUrl) : "";
  const logoFallback = schoolName.charAt(0) || "S";

  return `
    <html dir="${direction}">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          :root{
            --print-primary:${palette.primaryColor};
            --print-primary-strong:${palette.primaryStrong};
            --print-primary-deep:${palette.primaryDeep};
            --print-secondary:${palette.secondaryColor};
            --print-surface:${palette.accentSoft};
            --print-text:#10233a;
            --print-muted:#5f7388;
          }
          *{box-sizing:border-box}
          body{
            margin:0;
            padding:24px;
            background:#eef4fb;
            color:var(--print-text);
            font-family:Segoe UI,Tahoma,Arial,sans-serif;
          }
          .print-shell{
            max-width:1024px;
            margin:0 auto;
            background:#fff;
            border:1px solid rgba(16,35,58,.08);
            border-radius:28px;
            box-shadow:0 20px 56px rgba(15,23,42,.10);
            overflow:hidden;
          }
          .print-head{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:20px;
            padding:24px 28px 20px;
            border-bottom:1px solid rgba(16,35,58,.08);
            background:linear-gradient(135deg,var(--print-surface),#ffffff);
          }
          .print-brand{
            display:flex;
            align-items:center;
            gap:16px;
            min-width:0;
          }
          .print-logo,
          .print-logo-fallback{
            width:68px;
            height:68px;
            border-radius:20px;
            overflow:hidden;
            flex-shrink:0;
            border:1px solid rgba(16,35,58,.08);
            background:linear-gradient(135deg,var(--print-primary-strong),var(--print-secondary));
            display:flex;
            align-items:center;
            justify-content:center;
            color:#fff;
            font-size:24px;
            font-weight:900;
          }
          .print-logo{object-fit:cover}
          .print-head h1{
            margin:0;
            font-size:24px;
            line-height:1.2;
            color:var(--print-primary-deep);
          }
          .print-head p{
            margin:6px 0 0;
            color:var(--print-muted);
            font-size:14px;
          }
          .print-meta{
            text-align:${locale === "en" ? "right" : "left"};
          }
          .print-meta strong{
            display:block;
            font-size:18px;
            color:var(--print-primary-deep);
          }
          .print-meta span{
            display:block;
            margin-top:4px;
            color:var(--print-muted);
            font-size:13px;
          }
          .print-content{
            padding:24px 28px 30px;
          }
          table{
            width:100%;
            border-collapse:collapse;
          }
          th{
            background:linear-gradient(135deg,var(--print-primary-strong),var(--print-primary));
            color:#fff;
            padding:12px 14px;
            font-size:13px;
            text-align:${direction === "rtl" ? "right" : "left"};
          }
          td{
            padding:11px 14px;
            border-bottom:1px solid rgba(16,35,58,.08);
            font-size:13px;
            text-align:${direction === "rtl" ? "right" : "left"};
          }
          tr:nth-child(even) td{
            background:#f9fbff;
          }
          .print-panel{
            border:1px solid rgba(16,35,58,.08);
            border-radius:18px;
            padding:16px 18px;
            background:#f8fbff;
          }
          .print-grid{
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
            gap:12px;
          }
          .print-label{
            display:block;
            margin-bottom:6px;
            font-size:12px;
            color:var(--print-muted);
          }
          .print-value{
            font-size:17px;
            font-weight:800;
            color:var(--print-text);
          }
          .print-list{
            margin:0;
            padding-inline-start:20px;
            line-height:1.85;
          }
          @media print{
            body{background:#fff;padding:0}
            .print-shell{max-width:none;border:none;border-radius:0;box-shadow:none}
          }
          ${input.extraStyles || ""}
        </style>
      </head>
      <body>
        <div class="print-shell">
          <header class="print-head">
            <div class="print-brand">
              ${
                logoUrl
                  ? `<img class="print-logo" src="${logoUrl}" alt="${schoolName}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="print-logo-fallback" style="display:none">${logoFallback}</div>`
                  : `<div class="print-logo-fallback">${logoFallback}</div>`
              }
              <div>
                <h1>${schoolName}</h1>
                <p>${subtitle || title}</p>
              </div>
            </div>
            <div class="print-meta">
              <strong>${title}</strong>
              <span>${new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ar-IQ", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date())}</span>
            </div>
          </header>
          <main class="print-content">
            ${input.bodyHtml}
          </main>
        </div>
        ${input.autoPrint === false ? "" : "<script>window.print();</script>"}
      </body>
    </html>
  `;
}

export { escapeHtml };
