import type { ClassFee, SectionItem } from "../_components/types";

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function foldDashboardLookupValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

export function normalizeDashboardEntityName(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return normalizeWhitespace(value);
}

export function normalizeDashboardEntityKey(value: string | null | undefined) {
  return foldDashboardLookupValue(normalizeDashboardEntityName(value)).toLocaleLowerCase();
}

export function getDashboardRecordValueByName<T>(
  record: Record<string, T>,
  rawName: string | null | undefined,
): T | undefined {
  const normalizedName = normalizeDashboardEntityName(rawName);
  if (!normalizedName) return undefined;

  if (Object.prototype.hasOwnProperty.call(record, normalizedName)) {
    return record[normalizedName];
  }

  const normalizedKey = normalizeDashboardEntityKey(normalizedName);
  for (const [name, value] of Object.entries(record)) {
    if (normalizeDashboardEntityKey(name) === normalizedKey) {
      return value;
    }
  }

  return undefined;
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

export function buildLegacyDashboardSections(sectionNames: string[]) {
  const normalizedSections = Array.from(
    new Set(sectionNames.map((sectionName) => normalizeDashboardEntityName(sectionName)).filter(Boolean)),
  );

  // Legacy schemas store classes and sections in one table and some deployments
  // still require the section column to be non-null.
  return normalizedSections.length > 0 ? normalizedSections : [""];
}
