"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import type { TeacherRecord } from "../_types";

interface Props {
  show: boolean;
  teachers: TeacherRecord[];
  locale: "ar" | "en";
  schoolId: string;
  schoolName?: string;
  schoolLogoUrl?: string;
  onClose: () => void;
  onAccountsGenerated: () => void;
}

interface GeneratedAccount {
  teacherId: string;
  username: string;
  password: string;
}

export function TeacherAccountsModal({
  show,
  teachers,
  locale,
  schoolId,
  schoolName,
  schoolLogoUrl,
  onClose,
  onAccountsGenerated,
}: Props) {
  const isEn = locale === "en";

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedAccounts, setGeneratedAccounts] = useState<GeneratedAccount[]>([]);

  // Select all teachers whenever modal opens or teachers list changes
  useEffect(() => {
    if (show && teachers.length > 0) {
      setSelectedIds(new Set(teachers.map((t) => t.id)));
    }
  }, [show, teachers]);

  const allSelected = selectedIds.size === teachers.length && teachers.length > 0;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(teachers.map((t) => t.id)));
    }
  }, [allSelected, teachers]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    const ids = Array.from(selectedIds).filter((id) => {
      const t = teachers.find((x) => x.id === id);
      return t && !t.app_username; // only teachers without accounts
    });

    if (ids.length === 0) {
      setGenError(isEn ? "All selected teachers already have accounts." : "جميع المعلمين المحددين لديهم حسابات بالفعل.");
      return;
    }

    setGenerating(true);
    setGenError(null);

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        results: GeneratedAccount[];
        errors: Array<{ teacherId: string; error: string }>;
      }>("/api/web/teachers/bulk-accounts", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({ teacherIds: ids, school_id: schoolId }),
      });

      if (!response.ok || !payload?.ok) {
        const msg =
          (payload as { error?: { message?: string } } | null)?.error?.message ??
          (isEn ? "Failed to generate accounts." : "تعذر توليد الحسابات.");
        setGenError(msg);
        return;
      }

      setGeneratedAccounts((prev) => {
        const map = new Map(prev.map((a) => [a.teacherId, a]));
        for (const r of payload.results) map.set(r.teacherId, r);
        return Array.from(map.values());
      });

      onAccountsGenerated();
    } catch {
      setGenError(isEn ? "Network error. Please try again." : "خطأ في الشبكة. حاول مرة أخرى.");
    } finally {
      setGenerating(false);
    }
  }, [selectedIds, teachers, schoolId, isEn, onAccountsGenerated]);

  // Build merged teachers list with generated passwords
  const teachersWithAccounts: (TeacherRecord & {
    app_username?: string | null;
    app_password_plain?: string | null;
  })[] = teachers.map((t) => {
    const gen = generatedAccounts.find((a) => a.teacherId === t.id);
    if (gen) {
      return { ...t, app_username: gen.username, app_password_plain: gen.password, app_status: "active" as const };
    }
    return t;
  });

  const printableTeachers = teachersWithAccounts.filter((t) => t.app_username);

  const handlePrint = useCallback(async () => {
    if (printableTeachers.length === 0) return;

    const QRCode = (await import("qrcode")).default;
    const isEn = locale === "en";
    const cardFont = isEn
      ? "system-ui,-apple-system,sans-serif"
      : "'Noto Sans Arabic','Segoe UI',system-ui,sans-serif";

    // Generate QR codes for all printable teachers
    const qrMap: Record<string, string> = {};
    await Promise.all(
      printableTeachers.map(async (t) => {
        if (t.app_username && t.app_password_plain) {
          try {
            qrMap[t.id] = await QRCode.toDataURL(
              JSON.stringify({ username: t.app_username, password: t.app_password_plain }),
              { width: 130, margin: 1, color: { dark: "#1e1b4b", light: "#ffffff" } }
            );
          } catch { /* skip */ }
        }
      })
    );

    const cardHtml = (t: typeof printableTeachers[0]) => {
      const username = t.app_username ?? "";
      const password = t.app_password_plain ?? "";
      const qrSrc = qrMap[t.id] ?? "";
      const initials = t.full_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
      const contractLabel = (c: string | null) => {
        if (!c) return "";
        if (isEn) return c.replace("_", " ");
        const map: Record<string, string> = { full_time: "دوام كامل", part_time: "دوام جزئي", substitute: "بديل", volunteer: "متطوع" };
        return map[c] ?? c;
      };
      return `
        <div class="card">
          <div class="wm">${isEn ? "ID Card" : "بطاقة هوية"}</div>
          <div class="hdr">
            ${schoolLogoUrl
              ? `<img class="logo-img" src="${schoolLogoUrl}" alt=""/>`
              : `<div class="logo-ini">${(schoolName ?? "S")[0]}</div>`}
            <div class="hdr-text">
              <div class="school-name">${schoolName ?? (isEn ? "School" : "المدرسة")}</div>
              <div class="card-label">${isEn ? "Teacher ID Card" : "بطاقة هوية معلم"}</div>
            </div>
            <div class="hdr-dot"></div>
          </div>
          <div class="avatar-wrap">
            ${t.photo
              ? `<img class="avatar-img" src="${t.photo}" alt=""/>`
              : `<div class="avatar-ini">${initials}</div>`}
          </div>
          <div class="body">
            <div class="info">
              <div class="name">${t.full_name}</div>
              ${t.employee_id ? `<div class="emp-id"># ${t.employee_id}</div>` : ""}
              <div class="meta-grid">
                ${t.subject ? `<div class="mf"><div class="ml">${isEn ? "Subject" : "المادة"}</div><div class="mv">${t.subject}</div></div>` : ""}
                ${t.job_title ? `<div class="mf"><div class="ml">${isEn ? "Title" : "المسمى"}</div><div class="mv">${t.job_title}</div></div>` : ""}
                ${t.phone ? `<div class="mf"><div class="ml">${isEn ? "Phone" : "الهاتف"}</div><div class="mv" dir="ltr">${t.phone}</div></div>` : ""}
                ${t.contract_type ? `<div class="mf"><div class="ml">${isEn ? "Contract" : "العقد"}</div><div class="mv">${contractLabel(t.contract_type)}</div></div>` : ""}
              </div>
            </div>
            ${qrSrc ? `<div class="qr-wrap"><img class="qr" src="${qrSrc}" alt="QR"/><div class="qr-label">${isEn ? "Scan to login" : "مسح للدخول"}</div></div>` : ""}
          </div>
          ${username ? `
          <div class="creds">
            <div class="cred"><div class="cl">${isEn ? "Username" : "اسم المستخدم"}</div><div class="cv">${username}</div></div>
            <div class="cred"><div class="cl" style="color:#7c3aed">${isEn ? "Password" : "كلمة المرور"}</div><div class="cv">${password || "—"}</div></div>
          </div>` : ""}
        </div>`;
    };

    // Group into pairs — 2 cards per page
    const pairs: (typeof printableTeachers)[] = [];
    for (let i = 0; i < printableTeachers.length; i += 2) {
      pairs.push(printableTeachers.slice(i, i + 2));
    }

    const html = `<!DOCTYPE html>
<html dir="${isEn ? "ltr" : "rtl"}" lang="${isEn ? "en" : "ar"}">
<head>
<meta charset="utf-8">
<title>${isEn ? "Account Cards" : "بطاقات الحسابات"}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${cardFont};background:#f1f5f9;direction:${isEn ? "ltr" : "rtl"}}
  .page{display:flex;flex-direction:row;gap:8mm;padding:12mm;page-break-after:always;break-after:page;justify-content:center;align-items:center;min-height:calc(100vh - 24mm)}
  .page:last-child{page-break-after:auto;break-after:auto}
  .card{width:130mm;height:105mm;background:#fff;border:1px solid #c7d2fe;border-radius:14px;font-family:${cardFont};direction:${isEn ? "ltr" : "rtl"};display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;position:relative;box-shadow:0 4px 24px rgba(99,102,241,0.10);flex-shrink:0}
  .wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;font-size:44px;font-weight:900;color:#6366f1;opacity:0.04;transform:rotate(-25deg);white-space:nowrap;user-select:none;letter-spacing:4px}
  .hdr{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#9333ea 100%);padding:10px 14px 24px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;flex-shrink:0}
  .logo-img{width:28px;height:28px;border-radius:6px;object-fit:cover;border:1.5px solid rgba(255,255,255,0.4);flex-shrink:0}
  .logo-ini{width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:900;flex-shrink:0}
  .hdr-text{flex:1;min-width:0}
  .school-name{font-size:11px;font-weight:800;color:#fff;opacity:0.95;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .card-label{font-size:8px;font-weight:600;color:rgba(255,255,255,0.65);margin-top:1px}
  .hdr-dot{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);flex-shrink:0}
  .avatar-wrap{position:relative;z-index:2;margin-top:-20px;display:flex;justify-content:center;flex-shrink:0}
  .avatar-img{width:40px;height:40px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 2px 8px rgba(99,102,241,0.25)}
  .avatar-ini{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#4f46e5 0%,#9333ea 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:900;border:3px solid #fff;box-shadow:0 2px 8px rgba(99,102,241,0.25)}
  .body{flex:1;display:flex;gap:8px;padding:4px 12px 8px;position:relative;z-index:1;min-height:0}
  .info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
  .name{font-size:13px;font-weight:900;color:#1e1b4b;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .emp-id{display:inline-block;font-size:8px;font-weight:700;color:#6366f1;background:#ede9fe;border-radius:4px;padding:1px 7px;direction:ltr;text-align:center;margin:0 auto}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 6px;margin-top:3px}
  .mf{display:flex;flex-direction:column;gap:1px}
  .ml{font-size:7px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px}
  .mv{font-size:9px;font-weight:700;color:#334155}
  .qr-wrap{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px}
  .qr{width:60px;height:60px;border:2px solid #e0e7ff;border-radius:8px;display:block}
  .qr-label{font-size:6px;color:#94a3b8;font-weight:600;letter-spacing:0.3px}
  .creds{background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border-top:1px solid #e0e7ff;padding:6px 12px;display:grid;grid-template-columns:1fr 1fr;gap:5px;flex-shrink:0;position:relative;z-index:1}
  .cred{background:#fff;border:1px solid #e0e7ff;border-radius:6px;padding:3px 7px}
  .cl{font-size:7px;font-weight:800;color:#6366f1;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px}
  .cv{font-size:10px;font-weight:700;color:#1e1b4b;font-family:'Courier New',monospace;direction:ltr;text-align:start;letter-spacing:0.5px}
  @media print{body{background:#fff}.card{box-shadow:none}}
  @page{size:A4 landscape;margin:0}
</style>
</head>
<body>
${pairs.map(pair => `<div class="page">${pair.map(cardHtml).join("")}</div>`).join("\n")}
<script>window.addEventListener("load",()=>{window.print();})</script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, [printableTeachers, locale, schoolName, schoolLogoUrl]);

  if (!show) return null;

  return (
    <>
      {/* ── Screen Modal ── */}
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div
          className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          style={{ direction: isEn ? "ltr" : "rtl" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border)]">
            <div>
              <h2 className="text-lg font-black text-[var(--text-primary)]">
                {isEn ? "Account Cards" : "بطاقات الحسابات"}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {isEn
                  ? "Generate credentials and print cards for teachers"
                  : "توليد بيانات دخول وطباعة بطاقات للأساتذة"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label={isEn ? "Close" : "إغلاق"}
            >
              ✕
            </button>
          </div>

          {/* Teacher List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {/* Select All */}
            <label className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-lg hover:bg-[var(--surface-soft)] transition-colors">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 accent-[var(--primary)]"
              />
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {isEn ? "Select All" : "تحديد الكل"}
              </span>
              <span className="text-xs text-[var(--text-muted)] ms-auto">
                {selectedIds.size}/{teachers.length}
              </span>
            </label>

            <div className="border-t border-[var(--border)]" />

            {teachers.map((teacher) => {
              const hasAccount = !!teacher.app_username || generatedAccounts.some((a) => a.teacherId === teacher.id);
              return (
                <label
                  key={teacher.id}
                  className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-lg hover:bg-[var(--surface-soft)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(teacher.id)}
                    onChange={() => toggleOne(teacher.id)}
                    className="w-4 h-4 accent-[var(--primary)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {teacher.full_name}
                    </div>
                    {teacher.subject && (
                      <div className="text-xs text-[var(--text-muted)] truncate">{teacher.subject}</div>
                    )}
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: hasAccount
                        ? "color-mix(in srgb, var(--success) 12%, transparent)"
                        : "color-mix(in srgb, var(--text-muted) 12%, transparent)",
                      color: hasAccount ? "var(--success)" : "var(--text-muted)",
                    }}
                  >
                    {hasAccount
                      ? (isEn ? "Active" : "نشط")
                      : (isEn ? "No account" : "بدون حساب")}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Error */}
          {genError && (
            <div className="mx-6 px-4 py-2 rounded-lg bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)] text-sm border border-[color-mix(in_srgb,var(--danger)_20%,transparent)]">
              {genError}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border)]">
            <div className="text-xs text-[var(--text-muted)]">
              {printableTeachers.length > 0
                ? (isEn
                    ? `${printableTeachers.length} card(s) ready to print`
                    : `${printableTeachers.length} بطاقة جاهزة للطباعة`)
                : (isEn ? "Generate accounts to enable printing" : "ولّد حسابات لتفعيل الطباعة")}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-soft)] transition-colors"
              >
                {isEn ? "Close" : "إغلاق"}
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || selectedIds.size === 0}
                className="px-4 py-2 text-sm font-bold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating
                  ? (isEn ? "Generating…" : "جارٍ التوليد…")
                  : (isEn ? "Generate Accounts" : "توليد حسابات للمحددين")}
              </button>
              {printableTeachers.length > 0 && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 text-sm font-bold rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] hover:opacity-90 transition-opacity"
                >
                  {isEn ? "Print Cards" : "طباعة البطاقات"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
