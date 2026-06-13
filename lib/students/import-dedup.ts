function normalizeArabicCharacters(value: string) {
  return value
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي");
}

export function normalizeImportedStudentName(value: string | null | undefined) {
  if (typeof value !== "string") return "";

  return normalizeArabicCharacters(value)
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ar");
}

export type DuplicateStudentNameIssue = {
  normalizedName: string;
  displayName: string;
  firstRow: number;
  duplicateRows: number[];
};

export function collectDuplicateStudentNames(
  rows: Array<{ fullName: string | null | undefined }>,
): DuplicateStudentNameIssue[] {
  const seenByName = new Map<
    string,
    {
      displayName: string;
      firstRow: number;
      duplicateRows: number[];
    }
  >();

  rows.forEach((row, index) => {
    const displayName = typeof row.fullName === "string" ? row.fullName.trim() : "";
    const normalizedName = normalizeImportedStudentName(displayName);

    if (!normalizedName) {
      return;
    }

    const currentRowNumber = index + 1;
    const existing = seenByName.get(normalizedName);
    if (!existing) {
      seenByName.set(normalizedName, {
        displayName,
        firstRow: currentRowNumber,
        duplicateRows: [],
      });
      return;
    }

    existing.duplicateRows.push(currentRowNumber);
  });

  return Array.from(seenByName.entries())
    .filter(([, value]) => value.duplicateRows.length > 0)
    .map(([normalizedName, value]) => ({
      normalizedName,
      displayName: value.displayName,
      firstRow: value.firstRow,
      duplicateRows: value.duplicateRows,
    }));
}

export function findExistingDuplicateStudentNames(
  importedNames: Iterable<string | null | undefined>,
  existingNames: Iterable<string | null | undefined>,
) {
  const normalizedImportedNames = new Map<string, string>();

  for (const value of Array.from(importedNames)) {
    if (typeof value !== "string") continue;
    const displayName = value.trim();
    const normalized = normalizeImportedStudentName(displayName);
    if (!normalized || normalizedImportedNames.has(normalized)) continue;
    normalizedImportedNames.set(normalized, displayName);
  }

  const duplicates = new Map<string, string>();
  for (const value of Array.from(existingNames)) {
    if (typeof value !== "string") continue;
    const displayName = value.trim();
    const normalized = normalizeImportedStudentName(displayName);
    if (!normalized || !normalizedImportedNames.has(normalized) || duplicates.has(normalized)) continue;
    duplicates.set(normalized, normalizedImportedNames.get(normalized) ?? displayName);
  }

  return Array.from(duplicates.values());
}

export function buildDuplicateStudentNameMessage(options: {
  fileDuplicates?: DuplicateStudentNameIssue[];
  existingDuplicates?: string[];
}) {
  if (options.fileDuplicates && options.fileDuplicates.length > 0) {
    const firstDuplicate = options.fileDuplicates[0];
    const rows = [firstDuplicate.firstRow, ...firstDuplicate.duplicateRows].join("، ");
    return `لا يمكن استيراد الملف لأن اسم الطالب "${firstDuplicate.displayName}" مكرر داخل الملف نفسه في الصفوف: ${rows}.`;
  }

  if (options.existingDuplicates && options.existingDuplicates.length > 0) {
    return `لا يمكن استيراد الطلاب لأن الاسم "${options.existingDuplicates[0]}" موجود مسبقاً في بيانات المدرسة.`;
  }

  return "تم اكتشاف أسماء طلاب مكررة أثناء الاستيراد.";
}
