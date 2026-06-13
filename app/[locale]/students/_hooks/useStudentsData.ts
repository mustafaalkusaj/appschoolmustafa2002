"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/auth";
import type { StudentWithFees, StudentsMetaPayload, ClassFee, StudentDatasetRow } from "../_types";
import type { PagedFetchResult } from "@/hooks/usePagedSupabaseList";
import { usePagedSupabaseList } from "@/hooks/usePagedSupabaseList";
import { supabase } from "@/lib/supabase";
import { detectAppSchemaCompat } from "@/lib/schema-compat";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { deduplicatedFetch } from "@/lib/request-cache"; // ✅ إضافة deduplication
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
  currentBranchId?: string;
}

export interface UseStudentsDataReturn {
  pagedStudents: StudentWithFees[];
  totalCount: number;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  pagedLoading: boolean;
  pagedError: string | null;
  reload: () => void;
  backgroundReload: () => Promise<void>;
  addStudentOptimistically: (student: StudentWithFees) => void;
  updateStudentOptimistically: (id: string, update: Partial<StudentWithFees>) => void;
  removeStudentOptimistically: (id: string) => void;
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
    currentBranchId,
  } = options;

  const [totalPages, setTotalPages] = useState(0);
  const [studentsMeta, setStudentsMeta] = useState<StudentsMetaPayload>(EMPTY_STUDENT_META);
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [allStudentsDataset, setAllStudentsDataset] = useState<StudentWithFees[]>([]);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const datasetFilterKeyRef = useRef<string>("");
  // Tracks latest class fees request to prevent stale results overwriting newer ones
  const classFeesRequestRef = useRef(0);

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
      if (currentBranchId) params.set("branchId", currentBranchId);

      // ✅ إضافة deduplication للـ request
      const cacheKey = `students-fetch:${schoolId}:${currentPage}:${pageSize}:${activeTab}:${safeSearch}:${filterClass}:${filterSection}:${currentBranchId || ""}`;
      const { response, payload } = await deduplicatedFetch(
        cacheKey,
        () => fetchJsonWithAuthorizedSession<{
          students?: StudentListRow[];
          totalCount?: number;
          error?: { message?: string };
        }>(`/api/web/students/list?${params.toString()}`)
      );

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
    [profile, selectedSchoolId, debouncedSearch, pageSize, activeTab, filterClass, filterSection, currentBranchId],
  );

  const cacheKey = [
    "students",
    profile?.id || "guest",
    selectedSchoolId || "none",
    activeTab,
    debouncedSearch,
    filterClass,
    filterSection,
    currentBranchId || "",
  ].join("::");

  const { rows, totalCount, error: pagedError, loading: pagedLoading, reload, backgroundReload, addItem, removeItem, updateItem } = usePagedSupabaseList<StudentWithFees>({
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
    // Filter by branch: use currentBranchId (from runtimeBranding) first,
    // fallback to profile.branch_id (available immediately, before loadBranding finishes)
    const effectiveBranchId = currentBranchId || profile?.branch_id || null;
    // If scope is still loading and we have no branchId yet, wait — it will re-run when scopeLoading becomes false
    if (scopeLoading && !effectiveBranchId) return;
    // Track this request to avoid stale results overwriting newer ones (race condition fix)
    const requestId = ++classFeesRequestRef.current;
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
    const compat = await detectAppSchemaCompat();
    if (!schoolId && compat.classFeesSchoolScope) {
      if (requestId === classFeesRequestRef.current) setClassFees([]);
      return;
    }
    let query = supabase.from("class_fees").select("id, class_name, total_fee, installments, installment_amount, school_id, branch_id").order("class_name", { ascending: true });
    if (compat.classFeesSchoolScope && schoolId) {
      query = query.eq("school_id", schoolId);
    }
    if (effectiveBranchId) {
      query = query.eq("branch_id", effectiveBranchId);
    }
    const { data } = await query;
    // Only apply results if this is still the latest fetch (prevents stale overwrites)
    if (requestId === classFeesRequestRef.current) {
      setClassFees(data || []);
    }
  }, [profile, selectedSchoolId, currentBranchId, scopeLoading]);

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
    if (currentBranchId) params.set("branchId", currentBranchId);

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
  }, [profile, selectedSchoolId, activeTab, debouncedSearch, filterClass, filterSection, currentBranchId]);

  useEffect(() => {
    if (!profile || scopeLoading) return;
    void fetchStudentsMeta();
  }, [fetchStudentsMeta, profile, scopeLoading]);

  // List mutations (add/edit/delete) change the meta counts too — refresh both
  // together so the header badge and tab counters don't go stale.
  const backgroundReloadWithMeta = useCallback(async () => {
    await Promise.all([backgroundReload(), fetchStudentsMeta()]);
  }, [backgroundReload, fetchStudentsMeta]);

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
      if (currentBranchId) params.append("branchId", currentBranchId);

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
  }, [profile, selectedSchoolId, activeTab, debouncedSearch, filterClass, filterSection, allStudentsDataset, currentBranchId]);

  return useMemo(() => ({
    pagedStudents,
    totalCount,
    totalPages,
    setTotalPages,
    pagedLoading,
    pagedError,
    reload,
    backgroundReload: backgroundReloadWithMeta,
    addStudentOptimistically: addItem,
    updateStudentOptimistically: updateItem,
    removeStudentOptimistically: removeItem,
    studentsMeta,
    classFees,
    allStudentsDataset,
    datasetLoading,
    loadStudentsDataset,
  }), [pagedStudents, totalCount, totalPages, setTotalPages, pagedLoading, pagedError, reload, backgroundReloadWithMeta, addItem, updateItem, removeItem, studentsMeta, classFees, allStudentsDataset, datasetLoading, loadStudentsDataset]);
}
