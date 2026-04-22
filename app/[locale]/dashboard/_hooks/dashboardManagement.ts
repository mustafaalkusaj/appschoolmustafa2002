import type { ClassFee, SectionItem } from "../_components/types";

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeDashboardEntityName(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return normalizeWhitespace(value);
}

export function normalizeDashboardEntityKey(value: string | null | undefined) {
  return normalizeDashboardEntityName(value).toLocaleLowerCase();
}

export function resolveCanonicalDashboardClassName(
  rawClassName: string,
  availableClassNames: string[],
) {
  const normalizedInput = normalizeDashboardEntityKey(rawClassName);
  if (!normalizedInput) return "";

  const canonical = availableClassNames.find(
    (className) => normalizeDashboardEntityKey(className) === normalizedInput,
  );

  return canonical ? normalizeDashboardEntityName(canonical) : normalizeDashboardEntityName(rawClassName);
}

export function hasDuplicateDashboardFeeClass(
  classFees: ClassFee[],
  className: string,
  editingFeeId?: string | null,
) {
  const normalizedTarget = normalizeDashboardEntityKey(className);
  if (!normalizedTarget) return false;

  return classFees.some((fee) => {
    if (editingFeeId && fee.id === editingFeeId) return false;
    return normalizeDashboardEntityKey(fee.class_name) === normalizedTarget;
  });
}

export function hasDuplicateDashboardSection(
  sections: SectionItem[],
  classId: string,
  sectionName: string,
  editingSectionId?: string | null,
) {
  const normalizedTarget = normalizeDashboardEntityKey(sectionName);
  if (!classId || !normalizedTarget) return false;

  return sections.some((section) => {
    if (editingSectionId && section.id === editingSectionId) return false;
    return section.class_id === classId && normalizeDashboardEntityKey(section.name) === normalizedTarget;
  });
}
