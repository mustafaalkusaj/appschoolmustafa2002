"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import type { TeacherRecord } from "../../../_types";
import { buildWhatsAppShareLink, buildLoginCardMessage } from "@/lib/whatsapp";
import { buildSmsLink } from "@/lib/sms";

interface Props {
  teacher: TeacherRecord;
  schoolId: string | null;
  canManage: boolean;
  locale: "ar" | "en";
  refetch: () => Promise<void>;
}

export function AppAccountTab({ teacher, schoolId, canManage, locale, refetch }: Props) {
  const isEn = locale === "en";
  const [qrUrl, setQrUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [printSize, setPrintSize] = useState<"a5" | "a4">("a5");

  const generateQr = useCallback(async () => {
    if (!teacher.app_username || !schoolId) return;
    try {
      const QRCode = (await import("qrcode")).default;
      const url = await QRCode.toDataURL(
        JSON.stringify({ username: teacher.app_username, school: schoolId })
      );
      setQrUrl(url);
    } catch {
      // QR generation failed silently
    }
  }, [teacher.app_username, schoolId]);

  useEffect(() => {
    void generateQr();
  }, [generateQr]);

  const handleCreateAccount = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; username?: string; password?: string; message?: string;
      }>(
        `/api/web/teachers/${teacher.id}/app-account`,
        { method: "POST", headers: withJsonHeaders(), body: JSON.stringify({ school_id: schoolId }) }
      );
      if (response.ok && payload?.ok) {
        setSuccessMsg(isEn ? "Account created successfully" : "تم إنشاء الحساب بنجاح");
        if (payload.password) setNewPassword(payload.password);
        await refetch();
      } else {
        setError(payload?.message || (isEn ? "Failed to create account" : "تعذر إنشاء الحساب"));
      }
    } catch {
      setError(isEn ? "Error creating account" : "خطأ في إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    setNewPassword(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; password?: string; message?: string;
      }>(
        `/api/web/teachers/${teacher.id}/app-account`,
        { method: "PATCH", headers: withJsonHeaders(), body: JSON.stringify({ action: "reset_password", school_id: schoolId }) }
      );
      if (response.ok && payload?.ok) {
        setSuccessMsg(isEn ? "Password reset successfully" : "تم إعادة تعيين كلمة المرور");
        if (payload.password) setNewPassword(payload.password);
        await refetch();
      } else {
        setError(payload?.message || (isEn ? "Failed to reset password" : "تعذر إعادة تعيين كلمة المرور"));
      }
    } catch {
      setError(isEn ? "Error resetting password" : "خطأ في إعادة التعيين");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; app_status?: string; message?: string;
      }>(
        `/api/web/teachers/${teacher.id}/app-account`,
        { method: "PATCH", headers: withJsonHeaders(), body: JSON.stringify({ action: "toggle_status", school_id: schoolId }) }
      );
      if (response.ok && payload?.ok) {
        setSuccessMsg(isEn ? "Status updated" : "تم تحديث الحالة");
        await refetch();
      } else {
        setError(payload?.message || (isEn ? "Failed to update status" : "تعذر تحديث الحالة"));
      }
    } catch {
      setError(isEn ? "Error updating status" : "خطأ في التحديث");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!schoolId || !confirm(isEn ? "Delete app account?" : "هل أنت متأكد من حذف حساب التطبيق؟")) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; message?: string }>(
        `/api/web/teachers/${teacher.id}/app-account`,
        { method: "DELETE", headers: withJsonHeaders(), body: JSON.stringify({ school_id: schoolId }) }
      );
      if (response.ok && payload?.ok) {
        setSuccessMsg(isEn ? "Account deleted" : "تم حذف الحساب");
        await refetch();
      } else {
        setError(payload?.message || (isEn ? "Failed to delete account" : "تعذر حذف الحساب"));
      }
    } catch {
      setError(isEn ? "Error deleting account" : "خطأ في الحذف");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  const handlePrint = (size: "a5" | "a4" = printSize) => {
    if (!qrUrl) return;
    // C1: Password is shown once from create/reset (held in `newPassword`).
    // It is no longer stored in the DB, so re-printing later prints the card
    // without a password — the admin must Reset Password to get a new one.
    const pwd = newPassword ?? null;
    const initials = teacher.full_name.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0] ?? "").join("").toUpperCase();
    const isA4 = size === "a4";
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>بطاقة دخول — ${teacher.full_name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

    @page { size: ${isA4 ? "A4" : "A5"} portrait; margin: 0; }

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 100%; height: 100%;
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Full-page wrapper */
    .page {
      width:  ${isA4 ? "210mm" : "148mm"};
      min-height: ${isA4 ? "297mm" : "210mm"};
      padding: ${isA4 ? "14mm" : "10mm"};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f5f3ff;
    }

    /* ── CARD ────────────────────────────────── */
    .card {
      width: 100%;
      background: #fff;
      border-radius: ${isA4 ? "18px" : "14px"};
      overflow: hidden;
      border: 1px solid #ede9fe;
      box-shadow: 0 8px 32px rgba(109,40,217,0.13);
    }

    /* ── HEADER ──────────────────────────────── */
    .card-header {
      background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 55%, #6d28d9 100%);
      padding: ${isA4 ? "28px 28px 22px" : "20px 20px 16px"};
      position: relative; overflow: hidden;
      ${isA4 ? "display:flex; align-items:center; gap:20px;" : "text-align:center;"}
    }
    .card-header::before {
      content:''; position:absolute; top:-50px; right:-50px;
      width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,0.07);
    }
    .card-header::after {
      content:''; position:absolute; bottom:-30px; left:-30px;
      width:100px; height:100px; border-radius:50%; background:rgba(255,255,255,0.05);
    }
    .avatar {
      width: ${isA4 ? "80px" : "60px"};
      height: ${isA4 ? "80px" : "60px"};
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      border: 3px solid rgba(255,255,255,0.35);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      font-size: ${isA4 ? "28px" : "22px"}; font-weight: 900; color: #fff;
      ${isA4 ? "" : "margin: 0 auto 10px;"}
      position: relative;
    }
    .header-text { position: relative; ${isA4 ? "" : ""} }
    .card-type {
      font-size: ${isA4 ? "10px" : "9px"}; font-weight:700;
      color:rgba(255,255,255,0.6); letter-spacing:0.14em;
      text-transform:uppercase; margin-bottom:${isA4 ? "6px" : "4px"};
    }
    .teacher-name {
      font-size: ${isA4 ? "22px" : "17px"};
      font-weight:900; color:#fff;
      margin-bottom:${isA4 ? "4px" : "3px"};
    }
    .teacher-meta {
      font-size: ${isA4 ? "12px" : "10px"};
      color:rgba(255,255,255,0.7); font-weight:600;
    }

    /* ── BODY ────────────────────────────────── */
    .card-body {
      padding: ${isA4 ? "22px 28px" : "16px 20px"};
      display: flex;
      gap: ${isA4 ? "24px" : "16px"};
      align-items: flex-start;
      border-bottom: 1px solid #f1f0fe;
    }

    /* QR */
    .qr-wrap {
      flex-shrink: 0;
      width: ${isA4 ? "160px" : "110px"};
      height: ${isA4 ? "160px" : "110px"};
      border: 2px solid #ddd6fe;
      border-radius: ${isA4 ? "14px" : "10px"};
      padding: 6px; background: #fff;
      display: flex; align-items: center; justify-content: center;
    }
    .qr-wrap img { width:100%; height:100%; display:block; border-radius:6px; }

    .qr-info { flex:1; display:flex; flex-direction:column; gap:${isA4 ? "12px" : "8px"}; padding-top:4px; }
    .qr-hint {
      font-size: ${isA4 ? "12px" : "10px"};
      color:#6d28d9; font-weight:700; line-height:1.6;
    }
    .badge {
      display:inline-flex; align-items:center; gap:5px;
      background:#f5f3ff; border:1px solid #ddd6fe;
      border-radius:20px; padding:${isA4 ? "4px 12px" : "3px 9px"};
      font-size:${isA4 ? "11px" : "9px"}; font-weight:700; color:#5b21b6;
      width:fit-content;
    }
    .dot { width:6px; height:6px; border-radius:50%; background:#22c55e; }
    .emp-id { font-size:${isA4 ? "10px" : "9px"}; color:#9ca3af; font-weight:600; }

    /* ── CREDENTIALS ─────────────────────────── */
    .creds {
      padding: ${isA4 ? "18px 28px 22px" : "14px 20px 18px"};
      display:flex; flex-direction:column; gap:${isA4 ? "10px" : "8px"};
    }
    .creds-title {
      font-size:${isA4 ? "10px" : "9px"}; font-weight:700;
      color:#a78bfa; letter-spacing:0.12em; text-transform:uppercase;
      margin-bottom:${isA4 ? "4px" : "2px"};
    }
    .cred-row {
      background:#faf9ff; border:1px solid #ede9fe;
      border-radius:${isA4 ? "10px" : "8px"};
      padding:${isA4 ? "11px 16px" : "8px 12px"};
      display:flex; justify-content:space-between; align-items:center; gap:8px;
    }
    .cred-label {
      font-size:${isA4 ? "10px" : "9px"}; color:#8b5cf6; font-weight:700;
      text-transform:uppercase; letter-spacing:0.07em; white-space:nowrap;
    }
    .cred-value {
      font-family:'Courier New',monospace;
      font-size:${isA4 ? "14px" : "12px"}; font-weight:700;
      color:#1e1b4b; direction:ltr; text-align:left; word-break:break-all;
    }

    /* ── FOOTER ──────────────────────────────── */
    .card-footer {
      background:#faf9ff; border-top:1px solid #ede9fe;
      padding:${isA4 ? "12px 28px" : "9px 20px"};
      display:flex; align-items:center; justify-content:space-between;
    }
    .footer-note { font-size:${isA4 ? "10px" : "9px"}; color:#a78bfa; font-weight:600; }
    .footer-date { font-size:${isA4 ? "10px" : "9px"}; color:#c4b5fd; }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">

      <div class="card-header">
        <div class="avatar">${initials}</div>
        <div class="header-text">
          <div class="card-type">${isEn ? "Teacher · Login Card" : "معلم · بطاقة تسجيل الدخول"}</div>
          <div class="teacher-name">${teacher.full_name}</div>
          ${teacher.job_title || teacher.subject
            ? `<div class="teacher-meta">${[teacher.job_title, teacher.subject].filter(Boolean).join(" · ")}</div>`
            : ""}
        </div>
      </div>

      <div class="card-body">
        <div class="qr-wrap">
          <img src="${qrUrl}" alt="QR" id="qrimg"/>
        </div>
        <div class="qr-info">
          <div class="qr-hint">${isEn ? "Scan to log in to the mobile app" : "امسح الرمز للدخول في تطبيق الجوال"}</div>
          <div class="badge"><span class="dot"></span>${isEn ? "Active Account" : "حساب نشط"}</div>
          ${teacher.employee_id ? `<div class="emp-id">#${teacher.employee_id}</div>` : ""}
        </div>
      </div>

      <div class="creds">
        <div class="creds-title">${isEn ? "Login Credentials" : "بيانات تسجيل الدخول"}</div>
        <div class="cred-row">
          <span class="cred-label">${isEn ? "Username" : "اسم المستخدم"}</span>
          <span class="cred-value">${teacher.app_username ?? ""}</span>
        </div>
        ${pwd ? `<div class="cred-row">
          <span class="cred-label">${isEn ? "Password" : "كلمة المرور"}</span>
          <span class="cred-value">${pwd}</span>
        </div>` : ""}
      </div>

      <div class="card-footer">
        <span class="footer-note">${isEn ? "Keep this card confidential" : "يُرجى الحفاظ على سرية هذه البطاقة"}</span>
        <span class="footer-date">${new Date().toLocaleDateString("ar-IQ-u-nu-latn", {year:"numeric",month:"long",day:"numeric"})}</span>
      </div>

    </div>
  </div>
  <script>
    var img = document.getElementById('qrimg');
    function doPrint(){ setTimeout(function(){ window.print(); }, 250); }
    if(img.complete){ doPrint(); } else { img.onload = doPrint; }
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  if (!teacher.app_username) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-8 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-soft)] flex items-center justify-center text-3xl">
          📱
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          {isEn ? "No App Account" : "لا يوجد حساب تطبيق"}
        </h3>
        <p className="text-sm text-[var(--text-muted)] text-center">
          {isEn
            ? "Create an app account for this teacher to allow mobile access."
            : "أنشئ حساب تطبيق لهذا المعلم للوصول عبر الجوال."}
        </p>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {canManage && (
          <Button onClick={handleCreateAccount} disabled={loading}>
            {loading
              ? (isEn ? "Creating..." : "جاري الإنشاء...")
              : (isEn ? "Create App Account" : "إنشاء حساب التطبيق")}
          </Button>
        )}
      </div>
    );
  }

  const appStatusColor =
    teacher.app_status === "active"
      ? "bg-green-100 text-green-800 border-green-200"
      : teacher.app_status === "suspended"
      ? "bg-orange-100 text-orange-700 border-orange-200"
      : "bg-gray-100 text-gray-600 border-gray-200";

  const appStatusLabel =
    teacher.app_status === "active"
      ? (isEn ? "Active" : "نشط")
      : teacher.app_status === "suspended"
      ? (isEn ? "Suspended" : "موقوف")
      : (isEn ? "Inactive" : "غير نشط");

  return (
    <div className="flex flex-col gap-5">
      {/* Main card: QR + credentials side by side */}
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row">

          {/* QR + username + print — left panel */}
          <div className="flex flex-col items-center gap-4 p-6 sm:border-e border-[var(--card-border)] sm:w-56 flex-shrink-0 bg-[var(--surface-soft)]">
            {qrUrl ? (
              <img src={qrUrl} alt="QR Code" className="w-40 h-40 rounded-xl border border-[var(--card-border)] bg-white p-1" />
            ) : (
              <div className="w-40 h-40 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] flex items-center justify-center text-[var(--text-muted)] text-xs">
                {isEn ? "Loading..." : "جاري التحميل..."}
              </div>
            )}
            <span dir="ltr" className="font-mono text-xs text-[var(--text-secondary)] text-center break-all">
              {teacher.app_username}
            </span>

            {/* Size selector */}
            <div className="flex w-full rounded-lg border border-[var(--card-border)] overflow-hidden text-xs font-bold">
              {(["a5", "a4"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrintSize(s)}
                  className={[
                    "flex-1 py-1.5 transition-colors uppercase tracking-wider",
                    printSize === s
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]",
                  ].join(" ")}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={() => handlePrint(printSize)} disabled={!qrUrl} className="w-full justify-center">
              {isEn ? "🖨 Print Card" : "🖨 طباعة البطاقة"}
            </Button>

            {(() => {
              const sharePwd = newPassword ?? null;
              const sharePhone = teacher.phone ?? null;
              if (!sharePwd || !sharePhone || !teacher.app_username) return null;
              return (
                <div className="flex flex-col gap-1.5 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => {
                      const url = buildWhatsAppShareLink(sharePhone, {
                        username: teacher.app_username!,
                        password: sharePwd,
                        studentName: teacher.full_name,
                      });
                      window.open(url, "_blank", "noopener");
                    }}
                  >
                    {isEn ? "Share via WhatsApp" : "مشاركة عبر واتساب"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => {
                      const msg = buildLoginCardMessage({
                        username: teacher.app_username!,
                        password: sharePwd,
                        studentName: teacher.full_name,
                      });
                      window.open(buildSmsLink(sharePhone, msg), "_self");
                    }}
                  >
                    {isEn ? "Send SMS" : "إرسال SMS"}
                  </Button>
                </div>
              );
            })()}
          </div>

          {/* Account details — right panel */}
          <div className="flex-1 flex flex-col gap-4 p-6">
            <h3 className="font-bold text-[var(--text-primary)]">
              {isEn ? "Account Details" : "تفاصيل الحساب"}
            </h3>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)]">{isEn ? "Username" : "اسم المستخدم"}</span>
              <div className="flex items-center gap-2">
                <span dir="ltr" className="font-mono text-sm bg-[var(--surface-soft)] px-3 py-1.5 rounded-lg border border-[var(--card-border)] flex-1 text-start">
                  {teacher.app_username}
                </span>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(teacher.app_username!)}>
                  {isEn ? "Copy" : "نسخ"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)]">{isEn ? "Password" : "كلمة المرور"}</span>
              {(() => {
                const pwd = newPassword ?? null;
                if (!pwd) return (
                  <span className="font-mono text-sm text-[var(--text-muted)] px-3 py-1.5">••••••••</span>
                );
                return (
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm px-3 py-1.5 rounded-lg border flex-1 ${newPassword ? "bg-yellow-50 text-yellow-800 border-yellow-200" : "bg-[var(--surface-soft)] text-[var(--text-primary)] border-[var(--card-border)]"}`}>
                      {showPassword ? pwd : "••••••••"}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setShowPassword(p => !p)}>
                      {showPassword ? (isEn ? "Hide" : "إخفاء") : (isEn ? "Show" : "إظهار")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(pwd)}>
                      {isEn ? "Copy" : "نسخ"}
                    </Button>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[var(--text-muted)]">{isEn ? "Status" : "الحالة"}</span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${appStatusColor}`}>
                  {appStatusLabel}
                </span>
              </div>
              {canManage && (
                <Button variant="outline" size="sm" onClick={handleToggleStatus} disabled={loading}>
                  {teacher.app_status === "active"
                    ? (isEn ? "Suspend" : "إيقاف")
                    : (isEn ? "Activate" : "تفعيل")}
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)]">{isEn ? "Last Login" : "آخر دخول"}</span>
              <span className="text-sm text-[var(--text-primary)]">
                {teacher.app_last_login
                  ? new Date(teacher.app_last_login).toLocaleDateString("ar-IQ-u-nu-latn", {
                      year: "numeric", month: "long", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>

            {canManage && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--card-border)]">
                <Button variant="outline" size="sm" onClick={handleResetPassword} disabled={loading}>
                  {isEn ? "Reset Password" : "إعادة تعيين كلمة المرور"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger)]/5"
                >
                  {isEn ? "Delete Account" : "حذف الحساب"}
                </Button>
              </div>
            )}

            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
