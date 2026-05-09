"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, RefreshCw, ChevronDown } from "@/lib/icons";
import { SectionCard, EmptyState } from "../_components/ui";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface BranchCount {
  branch_id: string;
  branch_name: string;
  student_count: number;
}

interface SchoolCount {
  school_id: string;
  school_name: string;
  total_students: number;
  branches: BranchCount[];
}

interface StudentCountsPayload {
  ok: boolean;
  schools: SchoolCount[];
  grand_total: number;
  error?: { message?: string };
}

function SkeletonRow() {
  return (
    <tr>
      <td colSpan={3}>
        <div className="h-5 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
      </td>
    </tr>
  );
}

function SchoolRow({
  school,
  expanded,
  onToggle,
}: {
  school: SchoolCount;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-[var(--surface-muted)] transition-colors"
        onClick={onToggle}
      >
        <td>
          <div className="flex items-center gap-2 font-black text-[var(--text-primary)]">
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:bg-[var(--border)]"
              aria-label={expanded ? "طي الفروع" : "عرض الفروع"}
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
            >
              <ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {school.school_name}
          </div>
        </td>
        <td className="text-[var(--text-secondary)] text-sm">
          {school.branches.length > 0
            ? `${school.branches.length} فرع`
            : "لا يوجد فروع"}
        </td>
        <td>
          <span className="inline-flex items-center rounded-full bg-[var(--primary)]/10 px-3 py-1 text-sm font-black text-[var(--primary)]">
            {school.total_students.toLocaleString("ar-IQ")}
          </span>
        </td>
      </tr>
      {expanded &&
        school.branches.map((branch) => (
          <tr
            key={branch.branch_id}
            className="bg-[var(--surface-soft)]"
          >
            <td className="ps-10 text-sm text-[var(--text-secondary)]">
              — {branch.branch_name}
            </td>
            <td />
            <td>
              <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-bold text-[var(--text-secondary)]">
                {branch.student_count.toLocaleString("ar-IQ")}
              </span>
            </td>
          </tr>
        ))}
    </>
  );
}

export function StudentCountsTab() {
  const [schools, setSchools] = useState<SchoolCount[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<StudentCountsPayload>(
        "/api/web/super-admin/student-counts",
      );
      if (!response.ok || !payload?.ok) {
        setError(payload?.error?.message ?? "تعذر تحميل بيانات الطلاب.");
        return;
      }
      setSchools(payload.schools ?? []);
      setGrandTotal(payload.grand_total ?? 0);
    } catch {
      setError("تعذر تحميل بيانات الطلاب.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleSchool = useCallback((schoolId: string) => {
    setExpandedSchools((prev) => {
      const next = new Set(prev);
      if (next.has(schoolId)) {
        next.delete(schoolId);
      } else {
        next.add(schoolId);
      }
      return next;
    });
  }, []);

  return (
    <SectionCard
      title="أعداد الطلاب"
      description="عدد الطلاب النشطين لكل مدرسة وفرع. اضغط على المدرسة لعرض تفاصيل الفروع."
      actions={
        <button
          type="button"
          className="ui-button ui-button--secondary inline-flex items-center gap-2"
          onClick={() => void loadData()}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          تحديث
        </button>
      }
    >
      {error ? (
        <div className="rounded-[20px] border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-4 text-sm font-bold text-[var(--danger)]">
          {error}
        </div>
      ) : schools.length === 0 && !loading ? (
        <EmptyState
          icon={Users}
          title="لا توجد بيانات طلاب"
          description="لم يتم العثور على أي طلاب نشطين في النظام حالياً."
        />
      ) : (
        <div className="overflow-hidden rounded-[30px] border border-[var(--border)]">
          <div className="max-h-[72dvh] overflow-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>المدرسة</th>
                  <th>الفروع</th>
                  <th>عدد الطلاب</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : schools.map((school) => (
                      <SchoolRow
                        key={school.school_id}
                        school={school}
                        expanded={expandedSchools.has(school.school_id)}
                        onToggle={() => toggleSchool(school.school_id)}
                      />
                    ))}
              </tbody>
              {!loading && schools.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-muted)]">
                    <td colSpan={2} className="font-black text-[var(--text-primary)]">
                      الإجمالي الكلي
                    </td>
                    <td>
                      <span className="inline-flex items-center rounded-full bg-[var(--primary)] px-4 py-1 text-sm font-black text-white">
                        {grandTotal.toLocaleString("ar-IQ")}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
