"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  School,
  GraduationCap,
  Hash,
  CalendarDays,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface StudentProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  class_name: string | null;
  school_name: string | null;
  enrollment_date: string | null;
  student_id: string | null;
  avatar_url: string | null;
}

export default function StudentProfilePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    setPwLoading(true);

    try {
      const res = await fetch("/api/student/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const msgs: Record<string, string> = {
          wrong_password: t("كلمة المرور الحالية غير صحيحة", "Current password is incorrect"),
          password_too_short: t("كلمة المرور الجديدة قصيرة جداً (6 أحرف على الأقل)", "New password too short (min 6 chars)"),
          missing_fields: t("يرجى ملء جميع الحقول", "Please fill all fields"),
        };
        setPwError(msgs[data.error] ?? t("حدث خطأ", "Something went wrong"));
        return;
      }

      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setTimeout(() => setPwSuccess(false), 3000);
    } catch {
      setPwError(t("حدث خطأ في الاتصال", "Connection error"));
    } finally {
      setPwLoading(false);
    }
  }

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/profile")
      .then((res) => {
        if (res.response.ok)
          setProfile((res.payload as any)?.data ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  const fields: Array<{
    label: string;
    value: string | null;
    icon: typeof User;
    dir?: string;
  }> = [
    {
      label: t("الاسم الكامل", "Full Name"),
      value: profile?.full_name ?? null,
      icon: User,
    },
    {
      label: t("البريد الإلكتروني", "Email"),
      value: profile?.email ?? null,
      icon: Mail,
      dir: "ltr",
    },
    {
      label: t("رقم الهاتف", "Phone"),
      value: profile?.phone ?? null,
      icon: Phone,
      dir: "ltr",
    },
    {
      label: t("المدرسة", "School"),
      value: profile?.school_name ?? null,
      icon: School,
    },
    {
      label: t("الصف", "Class"),
      value: profile?.class_name ?? null,
      icon: GraduationCap,
    },
    {
      label: t("رقم الطالب", "Student ID"),
      value: profile?.student_id ?? null,
      icon: Hash,
      dir: "ltr",
    },
    {
      label: t("تاريخ التسجيل", "Enrollment Date"),
      value: profile?.enrollment_date ?? null,
      icon: CalendarDays,
    },
  ];

  return (
    <StudentShell
      currentPath="/student/profile"
      titleAr="ملفي الشخصي"
      titleEn="My Profile"
    >
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-32 rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
            <div className="h-[400px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
          </div>
        ) : profile ? (
          <>
            <Card>
              <CardContent className="pt-[var(--card-padding)]">
                <div className="flex flex-col items-center py-4">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-20 h-20 rounded-full object-cover border-4 border-[var(--primary)]/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[var(--primary)]/[0.12] flex items-center justify-center text-xl sm:text-2xl font-bold text-[var(--primary)]">
                      {initials}
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mt-3">
                    {profile.full_name ?? "—"}
                  </h2>
                  {profile.class_name && (
                    <Badge variant="primary" size="sm" className="mt-1.5">
                      {profile.class_name}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-[var(--primary)]" />
                  <CardTitle className="text-sm sm:text-base">
                    {t("المعلومات الشخصية", "Personal Information")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-[var(--card-border)]">
                  {fields.map((f) => {
                    const Icon = f.icon;
                    return (
                      <div
                        key={f.label}
                        className="flex items-center gap-2 sm:gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--primary)]/[0.08]">
                          <Icon className="h-4 w-4 text-[var(--primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[var(--text-muted)]">
                            {f.label}
                          </p>
                          <p
                            className="text-xs sm:text-sm font-medium text-[var(--text-primary)] truncate"
                            dir={f.dir}
                          >
                            {f.value ?? "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[var(--primary)]" />
                  <CardTitle className="text-sm sm:text-base">
                    {t("تغيير كلمة المرور", "Change Password")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-muted)]">
                      {t("كلمة المرور الحالية", "Current Password")}
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? "text" : "password"}
                        dir="ltr"
                        required
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-muted)]">
                      {t("كلمة المرور الجديدة", "New Password")}
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        dir="ltr"
                        required
                        minLength={6}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {pwError && (
                    <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/[0.08] rounded-lg px-3 py-2">
                      {pwError}
                    </p>
                  )}

                  {pwSuccess && (
                    <p className="text-xs text-[var(--success)] bg-[var(--success)]/[0.08] rounded-lg px-3 py-2 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      {t("تم تغيير كلمة المرور بنجاح", "Password changed successfully")}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={pwLoading || !currentPw || !newPw}
                    className="w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pwLoading
                      ? t("جاري التغيير...", "Changing...")
                      : t("تغيير كلمة المرور", "Change Password")}
                  </button>
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <EmptyState
            icon={
              <User className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("لا توجد بيانات", "No profile data")}
          />
        )}
      </div>
    </StudentShell>
  );
}
