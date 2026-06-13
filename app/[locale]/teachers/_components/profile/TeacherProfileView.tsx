"use client";
import { useState, useCallback } from "react";
import { useTeacherProfile } from "../../_hooks/useTeacherProfile";
import { TeacherProfileHeader } from "./TeacherProfileHeader";
import { TeacherFormModal } from "../TeacherFormModal";
import { InfoTab } from "./tabs/InfoTab";
import { AppAccountTab } from "./tabs/AppAccountTab";
import { ScheduleTab } from "./tabs/ScheduleTab";
import { FinanceTab } from "./tabs/FinanceTab";
import { LeavesTab } from "./tabs/LeavesTab";
import { PerformanceTab } from "./tabs/PerformanceTab";
import { AttendanceTab } from "./tabs/AttendanceTab";
import { NotificationsTab } from "./tabs/NotificationsTab";
import { SubjectsTab } from "./tabs/SubjectsTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import type { TeacherFormData } from "../../_types";

interface Props {
  teacherId: string;
  schoolId: string | null;
  scopeLoading: boolean;
  canManage: boolean;
  locale: "ar" | "en";
}

const TABS = [
  { id: "info",         labelAr: "المعلومات",    labelEn: "Info"        },
  { id: "app-account",  labelAr: "حساب التطبيق", labelEn: "App Account" },
  { id: "schedule",     labelAr: "الجدول",        labelEn: "Schedule"    },
  { id: "subjects",     labelAr: "المواد",         labelEn: "Subjects"    },
  { id: "finance",      labelAr: "الرواتب",        labelEn: "Finance"     },
  { id: "attendance",   labelAr: "الحضور",         labelEn: "Attendance"  },
  { id: "performance",  labelAr: "التقييمات",      labelEn: "Ratings"     },
  { id: "leaves",       labelAr: "الإجازات",       labelEn: "Leaves"      },
  { id: "documents",    labelAr: "الوثائق",        labelEn: "Documents"   },
  { id: "notifications",labelAr: "الإشعارات",      labelEn: "Alerts"      },
];

function LoadingSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4">
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-lg h-36" />
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-6 h-64" />
    </div>
  );
}

export function TeacherProfileView({ teacherId, schoolId, scopeLoading, canManage, locale }: Props) {
  const isEn = locale === "en";
  const [activeTab, setActiveTab] = useState("info");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const {
    teacher,
    loading,
    error,
    refetch,
    schedule,
    scheduleLoading,
    fetchSchedule,
    salaries,
    salaryLoading,
    fetchSalaries,
    leaves,
    leavesLoading,
    fetchLeaves,
    evaluations,
    evaluationsLoading,
    fetchEvaluations,
  } = useTeacherProfile(teacherId, schoolId);

  const handleEditSave = useCallback(async (form: TeacherFormData) => {
    setEditLoading(true);
    setEditError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean }>(
        `/api/web/teachers/${teacherId}`,
        { method: "PATCH", headers: withJsonHeaders(), body: JSON.stringify({ ...form, school_id: schoolId }) },
      );
      if (!response.ok) throw new Error((payload as any)?.error?.message || "تعذر الحفظ");
      setShowEditModal(false);
      await refetch();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setEditLoading(false);
    }
  }, [teacherId, schoolId, refetch]);

  if (scopeLoading || loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-8 flex flex-col items-center gap-3">
        <span className="text-4xl">⚠️</span>
        <p className="text-[var(--danger)] font-medium">{error}</p>
        <button type="button" onClick={() => void refetch()} className="text-sm text-[var(--primary)] underline">
          {isEn ? "Retry" : "إعادة المحاولة"}
        </button>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-8 flex flex-col items-center gap-3">
        <span className="text-4xl">🔍</span>
        <p className="text-[var(--text-muted)] text-sm">{isEn ? "Teacher not found." : "المعلم غير موجود."}</p>
      </div>
    );
  }

  function renderTab() {
    switch (activeTab) {
      case "info":
        return <InfoTab teacher={teacher!} locale={locale} />;
      case "app-account":
        return <AppAccountTab teacher={teacher!} schoolId={schoolId} canManage={canManage} locale={locale} refetch={refetch} />;
      case "schedule":
        return <ScheduleTab schedule={schedule} scheduleLoading={scheduleLoading} fetchSchedule={fetchSchedule} locale={locale} />;
      case "subjects":
        return <SubjectsTab teacher={teacher!} canManage={canManage} locale={locale} />;
      case "finance":
        return <FinanceTab teacher={teacher!} salaries={salaries} salaryLoading={salaryLoading} fetchSalaries={fetchSalaries} locale={locale} />;
      case "attendance":
        return <AttendanceTab teacherId={teacherId} schoolId={schoolId} locale={locale} />;
      case "performance":
        return <PerformanceTab evaluations={evaluations} evaluationsLoading={evaluationsLoading} fetchEvaluations={fetchEvaluations} locale={locale} />;
      case "leaves":
        return <LeavesTab teacherId={teacherId} schoolId={schoolId} leaves={leaves} leavesLoading={leavesLoading} fetchLeaves={fetchLeaves} canManage={canManage} locale={locale} />;
      case "documents":
        return <DocumentsTab teacherId={teacherId} schoolId={schoolId} canManage={canManage} locale={locale} />;
      case "notifications":
        return <NotificationsTab teacherId={teacherId} schoolId={schoolId} teacherName={teacher!.full_name} canManage={canManage} locale={locale} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header + Tabs — unified card */}
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-lg overflow-hidden">
        <div className="px-6 pt-6 pb-0">
          <TeacherProfileHeader
            teacher={teacher}
            canManage={canManage}
            locale={locale}
            onEdit={() => setShowEditModal(true)}
          />
        </div>

        {/* Tabs bar — bottom of the card */}
        <div className="flex gap-0 overflow-x-auto scrollbar-hide mt-5 border-t border-[var(--card-border)]">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const label = isEn ? tab.labelEn : tab.labelAr;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex-shrink-0 px-4 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap",
                  isActive
                    ? "border-[var(--primary)] text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>{renderTab()}</div>

      {/* Edit modal */}
      <TeacherFormModal
        show={showEditModal}
        editing={teacher}
        loading={editLoading}
        error={editError}
        onConfirm={handleEditSave}
        onClose={() => { setShowEditModal(false); setEditError(""); }}
        locale={locale}
      />
    </div>
  );
}
