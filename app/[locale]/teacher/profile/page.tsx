"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Shield,
  Eye,
  EyeOff,
  Save,
  Loader2,
} from "lucide-react";
import { TeacherShell } from "@/components/TeacherShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

interface ProfileData {
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  job_title: string | null;
}

export default function TeacherProfilePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/teacher/profile")
      .then((res) => {
        if (res.response.ok) {
          setProfile((res.payload as any)?.data?.profile ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handlePasswordChange() {
    if (!currentPwd || !newPwd) return;
    setPwdSaving(true);
    setPwdMsg(null);
    try {
      const res = await fetch("/api/teacher/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPwd,
          new_password: newPwd,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setPwdMsg({ type: "success", text: t("تم تغيير كلمة المرور بنجاح", "Password changed successfully") });
        setCurrentPwd("");
        setNewPwd("");
      } else {
        setPwdMsg({ type: "error", text: data.error ?? t("حدث خطأ", "Something went wrong") });
      }
    } catch {
      setPwdMsg({ type: "error", text: t("خطأ في الاتصال", "Connection error") });
    } finally {
      setPwdSaving(false);
    }
  }

  const fields: Array<{
    icon: typeof User;
    labelAr: string;
    labelEn: string;
    value: string | null | undefined;
    dir?: "ltr" | "rtl";
  }> = profile
    ? [
        { icon: Mail, labelAr: "البريد الإلكتروني", labelEn: "Email", value: profile.email, dir: "ltr" },
        { icon: Phone, labelAr: "الهاتف", labelEn: "Phone", value: profile.phone, dir: "ltr" },
        { icon: Briefcase, labelAr: "المسمى الوظيفي", labelEn: "Job Title", value: profile.job_title },
        { icon: Shield, labelAr: "الدور", labelEn: "Role", value: profile.role },
      ]
    : [];

  return (
    <TeacherShell
      currentPath="/teacher/profile"
      titleAr="الملف الشخصي"
      titleEn="Profile"
    >
      <div className="space-y-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            <div className="h-[200px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
            <div className="h-[160px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
          </div>
        ) : !profile ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-[var(--text-muted)]">
              {t("تعذر تحميل الملف الشخصي", "Could not load profile")}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Profile card */}
            <Card>
              <CardContent className="pt-[var(--card-padding)]">
                <div className="flex flex-col items-center gap-3 mb-4">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      width={72}
                      height={72}
                      className="rounded-full object-cover border-2 border-[var(--primary)]/20"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[var(--primary)]/[0.1]">
                      <span className="text-xl font-bold text-[var(--primary)]">
                        {profile.full_name
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")}
                      </span>
                    </div>
                  )}
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    {profile.full_name}
                  </h2>
                  {profile.job_title && (
                    <p className="text-xs text-[var(--text-muted)]">
                      {profile.job_title}
                    </p>
                  )}
                </div>
                <div className="divide-y divide-[var(--card-border)]">
                  {fields.map((f) => {
                    const Icon = f.icon;
                    return (
                      <div
                        key={f.labelEn}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <Icon className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                        <span className="text-xs text-[var(--text-muted)] min-w-[80px]">
                          {isAr ? f.labelAr : f.labelEn}
                        </span>
                        <span
                          className="text-xs sm:text-sm font-medium text-[var(--text-primary)] ms-auto truncate"
                          dir={f.dir}
                        >
                          {f.value ?? "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Password change */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">
                  {t("تغيير كلمة المرور", "Change Password")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Current password */}
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      placeholder={t("كلمة المرور الحالية", "Current password")}
                      className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 pe-10 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* New password */}
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder={t("كلمة المرور الجديدة", "New password")}
                      className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 pe-10 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {pwdMsg && (
                    <p
                      className={`text-xs rounded-lg px-3 py-2 ${
                        pwdMsg.type === "success"
                          ? "text-[var(--success)] bg-[var(--success)]/[0.08]"
                          : "text-[var(--danger)] bg-[var(--danger)]/[0.08]"
                      }`}
                    >
                      {pwdMsg.text}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={pwdSaving || !currentPwd || !newPwd}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pwdSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {pwdSaving
                      ? t("جاري الحفظ...", "Saving...")
                      : t("تغيير كلمة المرور", "Change Password")}
                  </button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TeacherShell>
  );
}
