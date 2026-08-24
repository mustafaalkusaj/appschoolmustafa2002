"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

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
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/profile")
      .then((res) => {
        if (res.response.ok) setProfile((res.payload as any)?.data ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const initials = profile?.full_name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  return (
    <StudentShell
      currentPath="/student/profile"
      titleAr="ملفي الشخصي"
      titleEn="My Profile"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-24 w-24 rounded-full bg-muted animate-pulse mx-auto" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : profile ? (
          <>
            <div className="flex flex-col items-center gap-3">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-24 h-24 rounded-full object-cover border-4 border-emerald-100 dark:border-emerald-900"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {initials}
                </div>
              )}
              <h2 className="text-xl font-bold">{profile.full_name ?? "—"}</h2>
              {profile.class_name && (
                <p className="text-sm text-muted-foreground">{profile.class_name}</p>
              )}
            </div>

            <div className="rounded-xl border divide-y">
              <ProfileRow
                label={isAr ? "الاسم الكامل" : "Full Name"}
                value={profile.full_name}
              />
              <ProfileRow
                label={isAr ? "البريد الإلكتروني" : "Email"}
                value={profile.email}
                dir="ltr"
              />
              <ProfileRow
                label={isAr ? "رقم الهاتف" : "Phone"}
                value={profile.phone}
                dir="ltr"
              />
              <ProfileRow
                label={isAr ? "المدرسة" : "School"}
                value={profile.school_name}
              />
              <ProfileRow
                label={isAr ? "الصف" : "Class"}
                value={profile.class_name}
              />
              <ProfileRow
                label={isAr ? "رقم الطالب" : "Student ID"}
                value={profile.student_id}
                dir="ltr"
              />
              <ProfileRow
                label={isAr ? "تاريخ التسجيل" : "Enrollment Date"}
                value={profile.enrollment_date}
              />
            </div>
          </>
        ) : (
          <div className="rounded-xl border p-8 text-center text-muted-foreground">
            <p className="text-4xl mb-2">👤</p>
            <p>{isAr ? "لا توجد بيانات" : "No profile data"}</p>
          </div>
        )}
      </div>
    </StudentShell>
  );
}

function ProfileRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: string | null;
  dir?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium" dir={dir}>{value ?? "—"}</span>
    </div>
  );
}
