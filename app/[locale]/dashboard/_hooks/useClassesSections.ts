"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { detectAppSchemaCompat } from "@/lib/schema-compat";
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
}

export function useClassesSections({
  profile,
  selectedSchoolId,
  scopeLoading,
  branchScoped = false,
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

  const fetchClasses = useCallback(async () => {
    const { school_id: schoolId, branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const compat = await detectAppSchemaCompat();
    if (!schoolId) {
      setClasses([]);
      return;
    }
    if (compat.classesNameColumn) {
      let query = supabase
        .from("classes")
        .select("*")
        .eq("school_id", schoolId)
        .order("name", { ascending: true });
      if (branchScoped && compat.classesBranchScope && branchId) {
        query = query.eq("branch_id", branchId);
      }
      const { data } = await query;
      if (data) setClasses(data as ClassItem[]);
      return;
    }

    let query = supabase
      .from("classes")
      .select("id, school_id, branch_id, grade, section")
      .eq("school_id", schoolId)
      .order("grade", { ascending: true })
      .order("section", { ascending: true });
    if (branchScoped && branchId) {
      query = query.eq("branch_id", branchId);
    }
    const { data } = await query;

    if (!data) return;
    const groups = new Map<string, { id: string; name: string; legacyClassIds: string[]; branch_id: string | null }>();
    (data as Array<Record<string, unknown>>).forEach((row) => {
      const grade = typeof row.grade === "string" ? row.grade : "";
      if (!grade) return;
      const existing = groups.get(grade);
      if (existing) {
        existing.legacyClassIds.push(String(row.id));
        return;
      }
      groups.set(grade, {
        id: `legacy:${grade}`,
        name: grade,
        legacyClassIds: [String(row.id)],
        branch_id: typeof row.branch_id === "string" ? row.branch_id : null,
      });
    });

    setClasses(Array.from(groups.values()));
  }, [branchScoped, profile, selectedSchoolId]);

  const fetchSections = useCallback(async () => {
    const { school_id: schoolId, branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const compat = await detectAppSchemaCompat();
    if (!schoolId) {
      setSections([]);
      return;
    }
    if (compat.classesNameColumn) {
      let classIds: string[] | null = null;
      if (branchScoped && compat.classesBranchScope && branchId) {
        const { data: scopedClasses } = await supabase
          .from("classes")
          .select("id")
          .eq("school_id", schoolId)
          .eq("branch_id", branchId);
        const scopedClassRows = (scopedClasses ?? []) as Array<{ id?: string | null }>;
        classIds = scopedClassRows
          .map((row) => (typeof row.id === "string" ? row.id : null))
          .filter((value): value is string => Boolean(value));
        if (classIds.length === 0) {
          setSections([]);
          return;
        }
      }
      let query = supabase
        .from("sections")
        .select("*, classes(name)")
        .order("name", { ascending: true });
      if (compat.sectionsSchoolScope) {
        query = query.eq("school_id", schoolId);
      }
      if (classIds && classIds.length > 0) {
        query = query.in("class_id", classIds);
      }
      const { data } = await query;
      if (data) setSections(data as SectionItem[]);
      return;
    }

    let query = supabase
      .from("classes")
      .select("id, grade, section, branch_id")
      .eq("school_id", schoolId)
      .order("grade", { ascending: true })
      .order("section", { ascending: true });
    if (branchScoped && branchId) {
      query = query.eq("branch_id", branchId);
    }
    const { data } = await query;

    if (!data) return;
    setSections(
      (data as Array<Record<string, unknown>>)
        .filter((row) => typeof row.grade === "string" && typeof row.section === "string" && row.section)
        .map((row) => ({
          id: String(row.id),
          class_id: `legacy:${String(row.grade)}`,
          name: String(row.section),
        }))
    );
  }, [branchScoped, profile, selectedSchoolId]);

  const handleSaveClass = useCallback(async (
    classForm: { name: string; sections: string[] },
    editingClass: ClassItem | null,
    onSuccess: () => void
  ) => {
    const { school_id: schoolId, branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const compat = await detectAppSchemaCompat();
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
    let mutationErrorMessage = "";
    const sectionsToAdd = Array.from(
      new Set(classForm.sections.map((section) => normalizeDashboardEntityName(section)).filter(Boolean)),
    );
    if (compat.classesNameColumn) {
      if (editingClass) {
        let classUpdate = supabase
          .from("classes")
          .update({ name: normalizedClassName })
          .eq("id", editingClass.id);
        if (schoolId) {
          classUpdate = classUpdate.eq("school_id", schoolId);
        }
        if (branchScoped && compat.classesBranchScope && branchId) {
          classUpdate = classUpdate.eq("branch_id", branchId);
        }
        const { error: classUpdateError } = await classUpdate;
        if (classUpdateError) {
          mutationErrorMessage = classUpdateError.message || "تعذر تحديث الصف.";
        }
        if (mutationErrorMessage) {
          setMutationLoading(false);
          setMutationError(mutationErrorMessage);
          return;
        }
        let sectionDelete = supabase.from("sections").delete().eq("class_id", editingClass.id);
        if (compat.sectionsSchoolScope) {
          sectionDelete = sectionDelete.eq("school_id", schoolId);
        }
        const { error: sectionDeleteError } = await sectionDelete;
        if (sectionDeleteError) {
          mutationErrorMessage = sectionDeleteError.message || "تعذر تحديث شعب الصف.";
          setMutationLoading(false);
          setMutationError(mutationErrorMessage);
          return;
        }
        for (const sec of sectionsToAdd) {
          const { error: sectionInsertError } = await supabase.from("sections").insert({
            class_id: editingClass.id,
            ...(compat.sectionsSchoolScope ? { school_id: schoolId } : {}),
            name: sec,
          });
          if (sectionInsertError) {
            mutationErrorMessage = sectionInsertError.message || "تعذر حفظ شعب الصف.";
            break;
          }
        }
      } else {
        const classPayload: Record<string, unknown> = {
          name: normalizedClassName,
          school_id: schoolId,
        };
        if (branchScoped && compat.classesBranchScope && branchId) {
          classPayload.branch_id = branchId;
        }
        const { data: newClass, error: classInsertError } = await supabase
          .from("classes")
          .insert(classPayload)
          .select()
          .single();
        if (classInsertError) {
          mutationErrorMessage = classInsertError.message || "تعذر إضافة الصف.";
        }
        if (newClass) {
          for (const sec of sectionsToAdd) {
            const { error: sectionInsertError } = await supabase.from("sections").insert({
              class_id: newClass.id,
              ...(compat.sectionsSchoolScope ? { school_id: schoolId } : {}),
              name: sec,
            });
            if (sectionInsertError) {
              mutationErrorMessage = sectionInsertError.message || "تعذر حفظ شعب الصف.";
              break;
            }
          }
        }
      }
    } else {
      if (editingClass?.legacyClassIds?.length) {
        const { error: deleteLegacyError } = await supabase.from("classes").delete().in("id", editingClass.legacyClassIds);
        if (deleteLegacyError) {
          mutationErrorMessage = deleteLegacyError.message || "تعذر تحديث الصف.";
          setMutationLoading(false);
          setMutationError(mutationErrorMessage);
          return;
        }
      }
      const legacySections = sectionsToAdd.length > 0 ? sectionsToAdd : [""];
      for (const sec of legacySections) {
        const { error: legacyInsertError } = await supabase.from("classes").insert({
          school_id: schoolId,
          branch_id: branchId || null,
          grade: normalizedClassName,
          section: sec || null,
        });
        if (legacyInsertError) {
          mutationErrorMessage = legacyInsertError.message || "تعذر حفظ الصف.";
          break;
        }
      }
    }
    if (mutationErrorMessage) {
      setMutationLoading(false);
      setMutationError(mutationErrorMessage);
      return;
    }
    await fetchClasses();
    await fetchSections();
    setMutationLoading(false);
    setMutationSuccess(editingClass ? "تم تحديث الصف بنجاح ✓" : "تمت إضافة الصف بنجاح ✓");
    onSuccess();
  }, [branchScoped, clearMutationFeedback, profile, selectedSchoolId, fetchClasses, fetchSections]);

  const handleDeleteClass = useCallback(async (id: string) => {
    const { school_id: schoolId, branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const compat = await detectAppSchemaCompat();
    if (compat.classesNameColumn) {
      let classDelete = supabase.from("classes").delete().eq("id", id);
      let sectionDelete = supabase.from("sections").delete().eq("class_id", id);
      if (schoolId) {
        classDelete = classDelete.eq("school_id", schoolId);
        if (compat.sectionsSchoolScope) {
          sectionDelete = sectionDelete.eq("school_id", schoolId);
        }
      }
      if (branchScoped && compat.classesBranchScope && branchId) {
        classDelete = classDelete.eq("branch_id", branchId);
      }
      await classDelete;
      await sectionDelete;
    } else {
      const targetClass = classes.find((item) => item.id === id);
      const legacyIds = Array.isArray(targetClass?.legacyClassIds) ? targetClass.legacyClassIds : [];
      if (legacyIds.length > 0) {
        await supabase.from("classes").delete().in("id", legacyIds);
      }
    }
    await fetchClasses();
    await fetchSections();
  }, [branchScoped, profile, selectedSchoolId, classes, fetchClasses, fetchSections]);

  const handleSaveSection = useCallback(async (
    sectionForm: { class_id: string; name: string },
    editingSection: SectionItem | null,
    onSuccess: () => void
  ) => {
    const { school_id: schoolId, branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const compat = await detectAppSchemaCompat();
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
    clearMutationFeedback();
    setMutationLoading(true);
    let mutationErrorMessage = "";
    if (compat.classesNameColumn) {
      if (editingSection) {
        const { error } = await supabase
          .from("sections")
          .update({ name: normalizedSectionName })
          .eq("id", editingSection.id);
        if (error) {
          mutationErrorMessage = error.message || "تعذر تحديث الشعبة.";
        }
      } else {
        if (!schoolId) {
          setMutationLoading(false);
          setMutationError("لا يمكن تحديد المدرسة الحالية.");
          return;
        }
        const { error } = await supabase.from("sections").insert({
          class_id: sectionForm.class_id,
          ...(compat.sectionsSchoolScope ? { school_id: schoolId } : {}),
          name: normalizedSectionName,
        });
        if (error) {
          mutationErrorMessage = error.message || "تعذر إضافة الشعبة.";
        }
      }
    } else {
      const targetClass = classes.find((item) => item.id === sectionForm.class_id);
      const gradeName = typeof targetClass?.name === "string" ? targetClass.name : "";
      if (!gradeName || !schoolId) {
        setMutationLoading(false);
        setMutationError("تعذر تحديد الصف الحالي لهذه الشعبة.");
        return;
      }
      if (editingSection) {
        const { error } = await supabase
          .from("classes")
          .update({ section: normalizedSectionName })
          .eq("id", editingSection.id);
        if (error) {
          mutationErrorMessage = error.message || "تعذر تحديث الشعبة.";
        }
      } else {
        const { error } = await supabase.from("classes").insert({
          school_id: schoolId,
          branch_id: branchId || null,
          grade: gradeName,
          section: normalizedSectionName,
        });
        if (error) {
          mutationErrorMessage = error.message || "تعذر إضافة الشعبة.";
        }
      }
    }
    if (mutationErrorMessage) {
      setMutationLoading(false);
      setMutationError(mutationErrorMessage);
      return;
    }
    await fetchSections();
    await fetchClasses();
    setMutationLoading(false);
    setMutationSuccess(editingSection ? "تم تحديث الشعبة بنجاح ✓" : "تمت إضافة الشعبة بنجاح ✓");
    onSuccess();
  }, [clearMutationFeedback, profile, selectedSchoolId, classes, sections, fetchSections, fetchClasses]);

  const handleDeleteSection = useCallback(async (id: string) => {
    const { school_id: schoolId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const compat = await detectAppSchemaCompat();
    if (compat.classesNameColumn) {
      let query = supabase.from("sections").delete().eq("id", id);
      if (schoolId && compat.sectionsSchoolScope) {
        query = query.eq("school_id", schoolId);
      }
      await query;
    } else {
      await supabase.from("classes").delete().eq("id", id);
    }
    await fetchSections();
    await fetchClasses();
  }, [profile, selectedSchoolId, fetchSections, fetchClasses]);

  useEffect(() => {
    if (!profile || scopeLoading) return;
    void fetchClasses();
    void fetchSections();
  }, [profile, scopeLoading, fetchClasses, fetchSections]);

  return {
    classes,
    sections,
    mutationError,
    mutationSuccess,
    mutationLoading,
    clearMutationFeedback,
    fetchClasses,
    fetchSections,
    handleSaveClass,
    handleDeleteClass,
    handleSaveSection,
    handleDeleteSection,
  };
}
