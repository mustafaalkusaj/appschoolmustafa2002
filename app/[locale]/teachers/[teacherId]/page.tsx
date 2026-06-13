"use client";
import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { TeacherProfileView } from "../_components/profile/TeacherProfileView";

export default function TeacherProfilePage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = use(params);
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const { profile, can } = useRole();
  const schoolScope = useSchoolScope(profile);
  const isEn = locale === "en";

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/teachers" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={isEn ? "Teacher Profile" : "ملف المعلم"}
            scope={schoolScope}
            fixed
          />
          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-5">

              {/* Hero Banner — card inside content, same as students page */}
              <div
                className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)" }}
              >
                <div className="absolute top-0 end-0 w-72 h-72 rounded-full opacity-[0.08] pointer-events-none" style={{ background: "white", transform: "translate(35%, -40%)" }} />
                <div className="absolute bottom-0 start-12 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none" style={{ background: "white", transform: "translateY(60%)" }} />

                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href="/teachers"
                      className="inline-flex items-center gap-1 text-white/60 hover:text-white/90 text-xs font-medium mb-2 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {isEn ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
                      </svg>
                      {isEn ? "Teachers" : "قائمة الأساتذة"}
                    </Link>
                    <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">
                      {isEn ? "Admin · Teachers" : "لوحة الإدارة · الأساتذة"}
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
                      {isEn ? "Teacher Profile" : "ملف المعلم"}
                    </h1>
                    <p className="text-white/70 text-sm">
                      {isEn ? "Detailed teacher information and activity" : "معلومات المعلم التفصيلية والنشاط"}
                    </p>
                  </div>
                  <div
                    className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                </div>
              </div>

              <TeacherProfileView
                teacherId={teacherId}
                schoolId={schoolScope.selectedSchoolId}
                scopeLoading={schoolScope.scopeLoading}
                canManage={can("manage_teachers")}
                locale={locale}
              />
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
