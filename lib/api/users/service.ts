import { type ManagedUserRecord, type ManagedTeacherAssignmentRecord } from "@/lib/managed-users";

export function normalizeIdentityText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function teacherAssignmentMatchesFilters(
  assignment: ManagedTeacherAssignmentRecord,
  filters: {
    classFilter: string;
    sectionFilter: string;
    subjectFilter: string;
  },
) {
  const classMatches =
    !filters.classFilter || normalizeIdentityText(assignment.class_name) === filters.classFilter;
  const subjectMatches =
    !filters.subjectFilter || normalizeIdentityText(assignment.subject_name) === filters.subjectFilter;
  const normalizedSection = normalizeIdentityText(assignment.section_name);
  const sectionMatches =
    !filters.sectionFilter || !normalizedSection || normalizedSection === filters.sectionFilter;

  return classMatches && subjectMatches && sectionMatches;
}

export function filterDecoratedManagedUsers(
  users: ManagedUserRecord[],
  filters: {
    roleFilter: string | null;
    searchQuery: string;
    classFilter: string;
    sectionFilter: string;
    subjectFilter: string;
  },
) {
  const normalizedSearch = normalizeIdentityText(filters.searchQuery);

  return users.filter((user) => {
    if (filters.roleFilter === "teacher" && user.role !== "teacher") {
      return false;
    }

    if (filters.roleFilter === "student" && user.role !== "student") {
      return false;
    }

    if (user.role === "teacher") {
      const assignments = user.teacher?.assignments ?? [];
      if ((filters.classFilter || filters.sectionFilter || filters.subjectFilter) && assignments.length === 0) {
        return false;
      }

      if (
        (filters.classFilter || filters.sectionFilter || filters.subjectFilter) &&
        !assignments.some((assignment) =>
          teacherAssignmentMatchesFilters(assignment, {
            classFilter: filters.classFilter,
            sectionFilter: filters.sectionFilter,
            subjectFilter: filters.subjectFilter,
          }),
        )
      ) {
        return false;
      }
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchableParts = [
      user.full_name,
      user.email,
      user.phone,
      user.app_account?.login_identifier,
      user.teacher?.specialization,
      ...(user.teacher?.assignments ?? []).flatMap((assignment) => [
        assignment.subject_name,
        assignment.class_name,
        assignment.section_name,
      ]),
    ];

    return searchableParts
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });
}
