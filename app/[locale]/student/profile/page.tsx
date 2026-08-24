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
      <div className="max-w-2xl mx-auto space-y-6">
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
                    <div className="w-20 h-20 rounded-full bg-[var(--primary)]/[0.12] flex items-center justify-center text-2xl font-bold text-[var(--primary)]">
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
                  <CardTitle className="text-base">
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
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--primary)]/[0.08]">
                          <Icon className="h-4 w-4 text-[var(--primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[var(--text-muted)]">
                            {f.label}
                          </p>
                          <p
                            className="text-sm font-medium text-[var(--text-primary)] truncate"
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
