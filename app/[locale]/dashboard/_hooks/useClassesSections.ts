"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { detectAppSchemaCompat } from "@/lib/schema-compat";
import { resolveSchoolIdForProfile, resolveSchoolBranchForProfile } from "@/lib/school/context";
import type { UserProfile } from "@/lib/auth";
import { ClassItem, SectionItem } from "../_components/types";

interface UseClassesSectionsProps {
  profile: UserProfile | null;
  selectedSchoolId: string | null;
  scopeLoading: boolean;
}

export function useClassesSections({ profile, selectedSchoolId, scopeLoading }: UseClassesSectionsProps) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);

  const fetchClasses = useCallback(async () => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
    const compat = await detectAppSchemaCompat();
    if (!schoolId) {
      setClasses([]);
      return;
    }
    if (compat.classesNameColumn) {
      const { data } = await supabase
        .from("classes")
        .select("*")
        .eq("school_id", schoolId)
        .order("name", { ascending: true });
      if (data) setClasses(data as ClassItem[]);
      return;
    }

    const { data } = await supabase
      .from("classes")
      .select("id, school_id, branch_id, grade, section")
      .eq("school_id", schoolId)
      .order("grade", { ascending: true })
      .order("section", { ascending: true });

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
  }, [profile, selectedSchoolId]);

  const fetchSections = useCallback(async () => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
    const compat = await detectAppSchemaCompat();
    if (!schoolId) {
      setSections([]);
      return;
    }
    if (compat.classesNameColumn) {
      let query = supabase
        .from("sections")
        .select("*, classes(name)")
        .order("name", { ascending: true });
      if (compat.sectionsSchoolScope) {
        query = query.eq("school_id", schoolId);
      }
      const { data } = await query;
      if (data) setSections(data as SectionItem[]);
      return;
    }

    const { data } = await supabase
      .from("classes")
      .select("id, grade, section")
      .eq("school_id", schoolId)
      .order("grade", { ascending: true })
      .order("section", { ascending: true });

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
  }, [profile, selectedSchoolId]);

  const handleSaveClass = useCallback(async (
    classForm: { name: string; sections: string[] },
    editingClass: ClassItem | null,
    onSuccess: () => void
  ) => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
    const { branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const compat = await detectAppSchemaCompat();
    if (!classForm.name.trim() || !schoolId) return;
    const sectionsToAdd = classForm.sections.filter(s => s.trim());
    if (compat.classesNameColumn) {
      if (editingClass) {
        await supabase.from("classes").update({ name: classForm.name.trim() }).eq("id", editingClass.id);
        let sectionDelete = supabase.from("sections").delete().eq("class_id", editingClass.id);
        if (compat.sectionsSchoolScope) {
          sectionDelete = sectionDelete.eq("school_id", schoolId);
        }
        await sectionDelete;
        for (const sec of sectionsToAdd) {
          await supabase.from("sections").insert({
            class_id: editingClass.id,
            ...(compat.sectionsSchoolScope ? { school_id: schoolId } : {}),
            name: sec.trim(),
          });
        }
      } else {
        const { data: newClass } = await supabase
          .from("classes")
          .insert({ name: classForm.name.trim(), school_id: schoolId })
          .select()
          .single();
        if (newClass) {
          for (const sec of sectionsToAdd) {
            await supabase.from("sections").insert({
              class_id: newClass.id,
              ...(compat.sectionsSchoolScope ? { school_id: schoolId } : {}),
              name: sec.trim(),
            });
          }
        }
      }
    } else {
      if (editingClass?.legacyClassIds?.length) {
        await supabase.from("classes").delete().in("id", editingClass.legacyClassIds);
      }
      const legacySections = sectionsToAdd.length > 0 ? sectionsToAdd : [""];
      for (const sec of legacySections) {
        await supabase.from("classes").insert({
          school_id: schoolId,
          branch_id: branchId || null,
          grade: classForm.name.trim(),
          section: sec.trim() || null,
        });
      }
    }
    await fetchClasses();
    await fetchSections();
    onSuccess();
  }, [profile, selectedSchoolId, fetchClasses, fetchSections]);

  const handleDeleteClass = useCallback(async (id: string) => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
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
  }, [profile, selectedSchoolId, classes, fetchClasses, fetchSections]);

  const handleSaveSection = useCallback(async (
    sectionForm: { class_id: string; name: string },
    editingSection: SectionItem | null,
    onSuccess: () => void
  ) => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
    const { branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const compat = await detectAppSchemaCompat();
    if (!sectionForm.class_id || !sectionForm.name.trim()) return;
    if (compat.classesNameColumn) {
      if (editingSection) {
        await supabase.from("sections").update({ name: sectionForm.name.trim() }).eq("id", editingSection.id);
      } else {
        if (!schoolId) return;
        await supabase.from("sections").insert({
          class_id: sectionForm.class_id,
          ...(compat.sectionsSchoolScope ? { school_id: schoolId } : {}),
          name: sectionForm.name.trim(),
        });
      }
    } else {
      const targetClass = classes.find((item) => item.id === sectionForm.class_id);
      const gradeName = typeof targetClass?.name === "string" ? targetClass.name : "";
      if (!gradeName || !schoolId) return;
      if (editingSection) {
        await supabase.from("classes").update({ section: sectionForm.name.trim() }).eq("id", editingSection.id);
      } else {
        await supabase.from("classes").insert({
          school_id: schoolId,
          branch_id: branchId || null,
          grade: gradeName,
          section: sectionForm.name.trim(),
        });
      }
    }
    await fetchSections();
    await fetchClasses();
    onSuccess();
  }, [profile, selectedSchoolId, classes, fetchSections, fetchClasses]);

  const handleDeleteSection = useCallback(async (id: string) => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
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
    fetchClasses,
    fetchSections,
    handleSaveClass,
    handleDeleteClass,
    handleSaveSection,
    handleDeleteSection,
  };
}
