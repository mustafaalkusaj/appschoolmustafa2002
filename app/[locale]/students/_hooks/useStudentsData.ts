"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/auth";
import type { StudentWithFees, StudentsMetaPayload, ClassFee, StudentDatasetRow } from "../_types";
import type { PagedFetchResult } from "@/hooks/usePagedSupabaseList";
import { usePagedSupabaseList } from "@/hooks/usePagedSupabaseList";
import { supabase } from "@/lib/supabase";
import { detectAppSchemaCompat } from "@/lib/schema-compat";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { normalizeStudentSearchValue, mapStudentRecordToStudentWithFees } from "../_utils";
import { EMPTY_STUDENT_META } from "../_constants";
import type { StudentListRow } from "@/lib/students/overview";

export interface UseStudentsDataOptions {
  profile: UserProfile | null;
  selectedSchoolId: string | null;
  scopeLoading: boolean;
  activeTab: string;
  debouncedSearch: string;
  filterClass: string;
  filterSection: string;
  pageSize: number;
  page: number;
}

export interface UseStudentsDataReturn {
  pagedStudents: StudentWithFees[];
  totalCount: number;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  pagedLoading: boolean;
  pagedError: string | null;
  reload: () => void;
  studentsMeta: StudentsMetaPayload;
  classFees: ClassFee[];
  allStudentsDataset: StudentWithFees[];
  datasetLoading: boolean;
  loadStudentsDataset: () => Promise<StudentWithFees[]>;
}

export function useStudentsData(options: UseStudentsDataOptions): UseStudentsDataReturn {
  const {
    profile,
    selectedSchoolId,
    scopeLoading,
    activeTab,
    debouncedSearch,
    filterClass,
    filterSection,
    pageSize,
    page,
  } = options;

  const [totalPages, setTotalPages] = useState(0);
  const [studentsMeta, setStudentsMeta] = useState<StudentsMetaPayload>(EMPTY_STUDENT_META);
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [allStudentsDataset, setAllStudentsDataset] = useState<StudentWithFees[]>([]);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const datasetFilterKeyRef = useRef<string>("");

  const fetchPagedStudents = useCallback(
    async (from: number): Promise<PagedFetchResult<StudentWithFees>> => {
      if (!profile) return { data: [], count: 0, error: null };
      const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
      if (!schoolId) return { data: [], count: 0, error: null };
      const safeSearch = normalizeStudentSearchValue(debouncedSearch);

      const currentPage = Math.floor(from / pageSize) + 1;
      const params = new URLSearchParams({
        schoolId,
        page: String(currentPage),
        pageSize: String(pageSize),
        status: activeTab,
      });
      if (safeSearch) params.set("search", safeSearch);
      if (filterClass) params.set("className", filterClass);
      if (filterSection) params.set("sectionName", filterSection);

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        students?: StudentListRow[];
        totalCount?: number;
        error?: { message?: string };
      }>(`/api/web/students/list?${params.toString()}`);

      if (!response.ok) {
        return {
          data: [],
          count: 0,
          error: { message: payload?.error?.message || "تعذر تحميل قائمة الطلاب.", details: "", hint: "", code: "FETCH_ERROR" } as PostgrestError,
        };
      }

      const typedData = (payload?.students ?? []).map((student) =>
        mapStudentRecordToStudentWithFees(student, schoolId),
      );
      return { data: typedData, count: payload?.totalCount ?? 0, error: null };
    },
    [profile, selectedSchoolId, debouncedSearch, pageSize, activeTab, filterClass, filterSection],
  );

  const cacheKey = [
    "students",
    profile?.id || "guest",
    selectedSchoolId || "none",
    activeTab,
    debouncedSearch,
    filterClass,
    filterSection,
  ].join("::");

  const { rows, totalCount, error: pagedError, loading: pagedLoading, reload } = usePagedSupabaseList<StudentWithFees>({
    enabled: Boolean(profile && !scopeLoading),
    page,
    pageSize,
    fetchPage: fetchPagedStudents,
    cacheKey,
  });

  const pagedStudents: StudentWithFees[] = rows || [];

  // Update total pages when count changes
  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(totalCount / pageSize)));
  }, [totalCount, pageSize]);

  // Fetch class fees
  const fetchClassFees = useCallback(async () => {
    if (!profile) return;
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
    const compat = await detectAppSchemaCompat();
    if (!schoolId && compat.classFeesSchoolScope) {
      setClassFees([]);
      return;
    }
    let query = supabase.from("class_fees").select("*").order("class_name", { ascending: true });
    if (compat.classFeesSchoolScope && schoolId) {
      query = query.eq("school_id", schoolId);
    }
    const { data } = await query;
    setClassFees(data || []);
  }, [profile, selectedSchoolId]);

  useEffect(() => {
    void fetchClassFees();
  }, [fetchClassFees]);

  // Fetch students meta
  const fetchStudentsMeta = useCallback(async () => {
    if (!profile) return;

    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
    if (!schoolId) {
      setStudentsMeta(EMPTY_STUDENT_META);
      return;
    }

    const safeSearch = normalizeStudentSearchValue(debouncedSearch);
    const params = new URLSearchParams({
      schoolId,
      status: activeTab,
    });
    if (safeSearch) params.set("search", safeSearch);
    if (filterClass) params.set("className", filterClass);
    if (filterSection) params.set("sectionName", filterSection);

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        summary?: StudentsMetaPayload["summary"];
        tabCounts?: StudentsMetaPayload["tabCounts"];
        sectionOptions?: string[];
        error?: { message?: string };
      }>(`/api/web/students/meta?${params.toString()}`);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل ملخص الطلاب.");
      }

      setStudentsMeta({
        summary: payload?.summary ?? EMPTY_STUDENT_META.summary,
        tabCounts: payload?.tabCounts ?? EMPTY_STUDENT_META.tabCounts,
        sectionOptions: payload?.sectionOptions ?? [],
      });
    } catch (metaError) {
      console.error("fetchStudentsMeta error:", metaError);
      setStudentsMeta(EMPTY_STUDENT_META);
    }
  }, [profile, selectedSchoolId, activeTab, debouncedSearch, filterClass, filterSection]);

  useEffect(() => {
    if (!profile || scopeLoading) return;
    void fetchStudentsMeta();
  }, [fetchStudentsMeta, profile, scopeLoading]);

  // Load all students dataset (for export)
  const loadStudentsDataset = useCallback(async (): Promise<StudentWithFees[]> => {
    if (!profile) return [];

    const filterKey = [
      profile.id,
      selectedSchoolId ?? "none",
      activeTab,
      debouncedSearch.trim(),
      filterClass.trim(),
      filterSection.trim(),
    ].join("::");

    if (datasetFilterKeyRef.current === filterKey) {
      return allStudentsDataset;
    }

    const schoolId = await resolveSchoolIdForProfile(profile, {
      selectedSchoolId,
    });
    if (!schoolId) return [];

    setDatasetLoading(true);
    try {
      const params = new URLSearchParams({
        schoolId,
        type: "students",
        status: activeTab,
      });
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (filterClass.trim()) params.append("className", filterClass.trim());
      if (filterSection.trim()) params.append("sectionName", filterSection.trim());

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        students?: StudentDatasetRow[];
        error?: { message?: string };
      }>(`/api/web/reports/dataset?${params.toString()}`);

      if (!response.ok) {
        console.error("Dataset fetch failed:", payload?.error?.message);
        return [];
      }

      const rawStudents: StudentDatasetRow[] = payload?.students ?? [];
      const fullDataset: StudentWithFees[] = rawStudents.map((item) =>
        mapStudentRecordToStudentWithFees(item, schoolId),
      );

      setAllStudentsDataset(fullDataset);
      datasetFilterKeyRef.current = filterKey;
      return fullDataset;
    } catch (err) {
      console.error("loadStudentsDataset error:", err);
      return [];
    } finally {
      setDatasetLoading(false);
    }
  }, [profile, selectedSchoolId, activeTab, debouncedSearch, filterClass, filterSection, allStudentsDataset]);

  return {
    pagedStudents,
    totalCount,
    totalPages,
    setTotalPages,
    pagedLoading,
    pagedError,
    reload,
    studentsMeta,
    classFees,
    allStudentsDataset,
    datasetLoading,
    loadStudentsDataset,
  };
}
