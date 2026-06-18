"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { deduplicatedFetch, clearCacheFor } from "@/lib/request-cache";
import { resolveSchoolBranchForProfile } from "@/lib/school/context";
import type { UserProfile } from "@/lib/auth";
import { ClassItem, SectionItem } from "../_components/types";
import {
  hasDuplicateDashboardSection,
  normalizeDashboardEntityName,
} from "./dashboardManagement";

interface UseClassesSectionsProps {
  profile: UserProfile | null;
  selectedSchoolId: string | null;
  scopeLoading: boolean;
  branchScoped?: boolean;
  branchId?: string | null;
}

interface DashboardStructureResponse {
  classes?: ClassItem[];
  sections?: SectionItem[];
  studentCountByClass?: Record<string, number>;
  studentCountBySection?: Record<string, number>;
  error?: { message?: string };
}

function resolveApiErrorMessage(
  payload: DashboardStructureResponse | null,
  fallback: string,
) {
  return payload?.error?.message || fallback;
}

export function useClassesSections({
  profile,
  selectedSchoolId,
  scopeLoading,
  branchScoped = false,
  branchId: externalBranchId,
}: UseClassesSectionsProps) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [mutationError, setMutationError] = useState("");
  const [mutationSuccess, setMutationSuccess] = useState("");
  const [mutationLoading, setMutationLoading] = useState(false);

  const clearMutationFeedback = useCallback(() => {
    setMutationError("");
    setMutationSuccess("");
  }, []);

  const fetchStructure = useCallback(async () => {
    const { school_id: schoolId, branch_id: resolvedBranchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });

    if (!schoolId) {
      setClasses([]);
      setSections([]);
      return;
    }

    const branchId = externalBranchId ?? resolvedBranchId;

    const params = new URLSearchParams({ schoolId });
    if (branchScoped) {
      params.set("branchScoped", "1");
      if (branchId) {
        params.set("branchId", branchId);
      }
    }

    const cacheKey = `dashboard-structure:${schoolId}:${branchScoped ? branchId : "none"}`;
    // Clear stale cache so mutations get fresh data
    clearCacheFor(cacheKey);
    const { response, payload } = await deduplicatedFetch(
      cacheKey,
      () => fetchJsonWithAuthorizedSession<DashboardStructureResponse>(
        `/api/web/dashboard/structure?${params.toString()}`,
      )
    );

    if (!response.ok) {
      throw new Error(resolveApiErrorMessage(payload ?? null, "تعذر تحميل الصفوف والشعب."));
    }

    const classesWithCounts = (payload?.classes ?? []).map((cls) => ({
      ...cls,
      studentCount: payload?.studentCountByClass?.[cls.name] ?? 0,
    }));
    const sectionsWithCounts = (payload?.sections ?? []).map((sec) => {
      const cls = classesWithCounts.find((c) => c.id === sec.class_id);
      const key = `${cls?.name ?? ""}||${sec.name}`;
      return { ...sec, studentCount: payload?.studentCountBySection?.[key] ?? 0 };
    });
    setClasses(classesWithCounts);
    setSections(sectionsWithCounts);
  }, [branchScoped, externalBranchId, profile, selectedSchoolId]);

  const handleSaveClass = useCallback(async (
    classForm: { name: string; sections: string[] },
    editingClass: ClassItem | null,
    onSuccess: () => void,
  ) => {
    const { school_id: schoolId, branch_id: resolvedBranchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const branchId = externalBranchId ?? resolvedBranchId;
    const normalizedClassName = normalizeDashboardEntityName(classForm.name);

    if (!schoolId) {
      setMutationError("لا يمكن تحديد المدرسة الحالية.");
      return;
    }

    if (!normalizedClassName) {
      setMutationError("يرجى إدخال اسم الصف.");
      return;
    }

    clearMutationFeedback();
    setMutationLoading(true);

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<DashboardStructureResponse>(
        "/api/web/dashboard/structure",
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            action: "save_class",
            school_id: schoolId,
            branch_id: branchId,
            branch_scoped: branchScoped,
            editing_class_id: editingClass?.id ?? null,
            legacy_class_ids: editingClass?.legacyClassIds ?? [],
            name: normalizedClassName,
            sections: classForm.sections,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(payload ?? null, "تعذر حفظ الصف."));
      }

      await fetchStructure();
      setMutationSuccess(editingClass ? "تم تحديث الصف بنجاح ✓" : "تمت إضافة الصف بنجاح ✓");
      onSuccess();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "تعذر حفظ الصف.");
    } finally {
      setMutationLoading(false);
    }
  }, [branchScoped, clearMutationFeedback, externalBranchId, fetchStructure, profile, selectedSchoolId]);

  const handleDeleteClass = useCallback(async (id: string) => {
    const { school_id: schoolId, branch_id: resolvedBranchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const branchId = externalBranchId ?? resolvedBranchId;

    if (!schoolId) {
      return;
    }

    const targetClass = classes.find((item) => item.id === id);

    clearMutationFeedback();
    setMutationLoading(true);

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<DashboardStructureResponse>(
        "/api/web/dashboard/structure",
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            action: "delete_class",
            school_id: schoolId,
            branch_id: branchId,
            branch_scoped: branchScoped,
            class_id: id,
            legacy_class_ids: targetClass?.legacyClassIds ?? [],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(payload ?? null, "تعذر حذف الصف."));
      }

      await fetchStructure();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "تعذر حذف الصف.");
    } finally {
      setMutationLoading(false);
    }
  }, [branchScoped, classes, clearMutationFeedback, externalBranchId, fetchStructure, profile, selectedSchoolId]);

  const handleSaveSection = useCallback(async (
    sectionForm: { class_id: string; name: string },
    editingSection: SectionItem | null,
    onSuccess: () => void,
  ) => {
    const { school_id: schoolId, branch_id: resolvedBranchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const branchId = externalBranchId ?? resolvedBranchId;
    const normalizedSectionName = normalizeDashboardEntityName(sectionForm.name);

    if (!sectionForm.class_id) {
      setMutationError("يرجى اختيار الصف أولاً.");
      return;
    }

    if (!normalizedSectionName) {
      setMutationError("يرجى إدخال اسم الشعبة.");
      return;
    }

    if (hasDuplicateDashboardSection(sections, sectionForm.class_id, normalizedSectionName, editingSection?.id)) {
      setMutationError("هذه الشعبة مضافة مسبقاً لهذا الصف.");
      return;
    }

    if (!schoolId) {
      setMutationError("لا يمكن تحديد المدرسة الحالية.");
      return;
    }

    const targetClass = classes.find((item) => item.id === sectionForm.class_id);

    clearMutationFeedback();
    setMutationLoading(true);

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<DashboardStructureResponse>(
        "/api/web/dashboard/structure",
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            action: "save_section",
            school_id: schoolId,
            branch_id: branchId,
            branch_scoped: branchScoped,
            section_id: editingSection?.id ?? null,
            class_id: sectionForm.class_id,
            class_name: targetClass?.name ?? null,
            name: normalizedSectionName,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(payload ?? null, "تعذر حفظ الشعبة."));
      }

      await fetchStructure();
      setMutationSuccess(editingSection ? "تم تحديث الشعبة بنجاح ✓" : "تمت إضافة الشعبة بنجاح ✓");
      onSuccess();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "تعذر حفظ الشعبة.");
    } finally {
      setMutationLoading(false);
    }
  }, [branchScoped, classes, clearMutationFeedback, externalBranchId, fetchStructure, profile, sections, selectedSchoolId]);

  const handleDeleteSection = useCallback(async (id: string) => {
    const { school_id: schoolId, branch_id: resolvedBranchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const branchId = externalBranchId ?? resolvedBranchId;

    if (!schoolId) {
      return;
    }

    clearMutationFeedback();
    setMutationLoading(true);

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<DashboardStructureResponse>(
        "/api/web/dashboard/structure",
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            action: "delete_section",
            school_id: schoolId,
            branch_id: branchId,
            branch_scoped: branchScoped,
            section_id: id,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(payload ?? null, "تعذر حذف الشعبة."));
      }

      await fetchStructure();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "تعذر حذف الشعبة.");
    } finally {
      setMutationLoading(false);
    }
  }, [branchScoped, clearMutationFeedback, externalBranchId, fetchStructure, profile, selectedSchoolId]);

  useEffect(() => {
    if (!profile || scopeLoading) return;

    void fetchStructure().catch((err) => {
      console.error("[useClassesSections] fetchStructure failed:", err);
      setClasses([]);
      setSections([]);
    });
  }, [fetchStructure, profile, scopeLoading]);

  return useMemo(() => ({
    classes,
    sections,
    mutationError,
    mutationSuccess,
    mutationLoading,
    clearMutationFeedback,
    handleSaveClass,
    handleDeleteClass,
    handleSaveSection,
    handleDeleteSection,
    refetch: fetchStructure,
  }), [classes, sections, mutationError, mutationSuccess, mutationLoading, clearMutationFeedback, handleSaveClass, handleDeleteClass, handleSaveSection, handleDeleteSection, fetchStructure]);
}
