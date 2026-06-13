"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import type {
  GradeEntry,
  GradeType,
  ClassOption,
  SectionOption,
  SubjectOption,
  GradeFilters,
  GradeStats,
} from "../_types";

interface UseGradesDataOptions {
  schoolId: string;
  branchId?: string | null;
  filters: GradeFilters;
}

interface UseGradesDataReturn {
  entries: GradeEntry[];
  loading: boolean;
  error: string | null;
  subjects: SubjectOption[];
  gradeTypes: GradeType[];
  classes: ClassOption[];
  sections: SectionOption[];
  stats: GradeStats;
  reload: () => void;
}

const EMPTY_STATS: GradeStats = {
  total: 0,
  draft: 0,
  confirmed: 0,
  locked: 0,
  avgPercentage: 0,
  passCount: 0,
  failCount: 0,
};

function computeStats(entries: GradeEntry[]): GradeStats {
  if (entries.length === 0) return EMPTY_STATS;
  const draft = entries.filter((e) => e.status === "draft").length;
  const confirmed = entries.filter((e) => e.status === "confirmed").length;
  const locked = entries.filter((e) => e.status === "locked").length;
  const total = entries.length;
  const avgPercentage =
    total > 0
      ? Math.round(entries.reduce((s, e) => s + (e.percentage ?? 0), 0) / total)
      : 0;
  const passCount = entries.filter((e) => (e.percentage ?? 0) >= 50).length;
  const failCount = total - passCount;
  return { total, draft, confirmed, locked, avgPercentage, passCount, failCount };
}

export function useGradesData({ schoolId, branchId, filters }: UseGradesDataOptions): UseGradesDataReturn {
  const [entries, setEntries] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [gradeTypes, setGradeTypes] = useState<GradeType[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);

  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  // Load static data once per schoolId
  useEffect(() => {
    if (!schoolId) return;

    const ac = new AbortController();

    Promise.all([
      fetchJsonWithAuthorizedSession<{ ok: boolean; subjects: SubjectOption[] }>(
        `/api/web/grades/subjects?schoolId=${schoolId}`
      ),
      fetchJsonWithAuthorizedSession<{ ok: boolean; gradeTypes: GradeType[] }>(
        `/api/web/grades/schemes?schoolId=${schoolId}&activeOnly=true`
      ),
      fetchJsonWithAuthorizedSession<{
        ok: boolean;
        classes: ClassOption[];
        sections: SectionOption[];
      }>(
        branchId
          ? `/api/web/dashboard/structure?schoolId=${schoolId}&branchScoped=1&branchId=${branchId}`
          : `/api/web/dashboard/structure?schoolId=${schoolId}`,
      ),
    ])
      .then(([subjectsRes, typesRes, structureRes]) => {
        if (ac.signal.aborted) return;
        if (subjectsRes.payload?.ok) setSubjects(subjectsRes.payload.subjects ?? []);
        if (typesRes.payload?.ok) setGradeTypes(typesRes.payload.gradeTypes ?? []);
        if (structureRes.payload?.ok) {
          setClasses(structureRes.payload.classes ?? []);
          setSections(structureRes.payload.sections ?? []);
        }
      })
      .catch(() => {});

    return () => ac.abort();
  }, [schoolId, branchId]);

  // Load grade entries when filters change
  useEffect(() => {
    if (!schoolId || !filters.academicYear) {
      setEntries([]);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ schoolId, academicYear: filters.academicYear, semester: String(filters.semester) });
    if (filters.classId) params.set("classId", filters.classId);
    if (filters.sectionId) params.set("sectionId", filters.sectionId);
    if (filters.subjectId) params.set("subjectId", filters.subjectId);
    if (filters.gradeTypeId) params.set("gradeTypeId", filters.gradeTypeId);
    if (filters.status) params.set("status", filters.status);

    fetchJsonWithAuthorizedSession<{ ok: boolean; items: GradeEntry[]; count: number }>(
      `/api/web/grades?${params.toString()}`
    )
      .then(({ payload }) => {
        if (ac.signal.aborted) return;
        if (payload?.ok) {
          setEntries(payload.items ?? []);
        } else {
          setEntries([]);
        }
        setLoading(false);
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setError("تعذر تحميل الدرجات");
        setLoading(false);
      });

    return () => ac.abort();
  }, [schoolId, filters.academicYear, filters.semester, filters.classId, filters.sectionId, filters.subjectId, filters.gradeTypeId, filters.status, reloadTick]);

  const stats = useMemo(() => computeStats(entries), [entries]);

  return { entries, loading, error, subjects, gradeTypes, classes, sections, stats, reload };
}
