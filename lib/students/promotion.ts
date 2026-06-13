type PromotionMatchKind = "numeric" | "arabic" | "english";

type PromotionMatch = {
  level: number;
  kind: PromotionMatchKind;
  token: string;
};

const ARABIC_WORDS: Record<number, string> = {
  1: "الأول",
  2: "الثاني",
  3: "الثالث",
  4: "الرابع",
  5: "الخامس",
  6: "السادس",
  7: "السابع",
  8: "الثامن",
  9: "التاسع",
  10: "العاشر",
  11: "الحادي عشر",
  12: "الثاني عشر",
};

const ARABIC_VARIANTS: Array<{ level: number; variants: string[] }> = [
  { level: 12, variants: ["الثاني عشر", "ثاني عشر"] },
  { level: 11, variants: ["الحادي عشر", "حادي عشر"] },
  { level: 10, variants: ["العاشر", "عاشر"] },
  { level: 9, variants: ["التاسع", "تاسع"] },
  { level: 8, variants: ["الثامن", "ثامن"] },
  { level: 7, variants: ["السابع", "سابع"] },
  { level: 6, variants: ["السادس", "سادس"] },
  { level: 5, variants: ["الخامس", "خامس"] },
  { level: 4, variants: ["الرابع", "رابع"] },
  { level: 3, variants: ["الثالث", "ثالث"] },
  { level: 2, variants: ["الثاني", "ثاني"] },
  { level: 1, variants: ["الأول", "اول", "أول", "الاول"] },
];

const ENGLISH_WORDS: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  6: "sixth",
  7: "seventh",
  8: "eighth",
  9: "ninth",
  10: "tenth",
  11: "eleventh",
  12: "twelfth",
};

const ENGLISH_VARIANTS: Array<{ level: number; variants: string[] }> = [
  { level: 12, variants: ["twelfth", "grade 12"] },
  { level: 11, variants: ["eleventh", "grade 11"] },
  { level: 10, variants: ["tenth", "grade 10"] },
  { level: 9, variants: ["ninth", "grade 9"] },
  { level: 8, variants: ["eighth", "grade 8"] },
  { level: 7, variants: ["seventh", "grade 7"] },
  { level: 6, variants: ["sixth", "grade 6"] },
  { level: 5, variants: ["fifth", "grade 5"] },
  { level: 4, variants: ["fourth", "grade 4"] },
  { level: 3, variants: ["third", "grade 3"] },
  { level: 2, variants: ["second", "grade 2"] },
  { level: 1, variants: ["first", "grade 1"] },
];

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function toAsciiDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function toArabicIndicDigits(value: string) {
  return value.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)] ?? digit);
}

function matchArabicWord(className: string): PromotionMatch | null {
  for (const entry of ARABIC_VARIANTS) {
    for (const variant of entry.variants) {
      if (className.includes(variant)) {
        return {
          level: entry.level,
          kind: "arabic",
          token: variant,
        };
      }
    }
  }

  return null;
}

function matchEnglishWord(className: string): PromotionMatch | null {
  const lowered = className.toLowerCase();
  for (const entry of ENGLISH_VARIANTS) {
    for (const variant of entry.variants) {
      if (lowered.includes(variant)) {
        return {
          level: entry.level,
          kind: "english",
          token: variant,
        };
      }
    }
  }

  return null;
}

function matchNumericGrade(className: string): PromotionMatch | null {
  const numericMatch = className.match(/(?:grade\s*)?([0-9٠-٩]{1,2})/i);
  if (!numericMatch?.[1]) {
    return null;
  }

  const level = Number(toAsciiDigits(numericMatch[1]));
  if (!Number.isInteger(level) || level <= 0) {
    return null;
  }

  return {
    level,
    kind: "numeric",
    token: numericMatch[1],
  };
}

function findPromotionMatch(className: string): PromotionMatch | null {
  const normalized = normalizeSpaces(className);
  if (!normalized) {
    return null;
  }

  return matchArabicWord(normalized) ?? matchNumericGrade(normalized) ?? matchEnglishWord(normalized);
}

export function promoteClassName(className: string | null | undefined) {
  const normalized = normalizeSpaces(typeof className === "string" ? className : "");
  if (!normalized) {
    return {
      promoted: false as const,
      reason: "missing" as const,
      currentClassName: normalized,
      nextClassName: null,
    };
  }

  const match = findPromotionMatch(normalized);
  if (!match) {
    return {
      promoted: false as const,
      reason: "unrecognized" as const,
      currentClassName: normalized,
      nextClassName: null,
    };
  }

  if (match.level >= 12) {
    return {
      promoted: false as const,
      reason: "terminal" as const,
      currentClassName: normalized,
      nextClassName: null,
    };
  }

  const nextLevel = match.level + 1;
  let nextToken = match.token;
  if (match.kind === "arabic") {
    nextToken = ARABIC_WORDS[nextLevel];
  } else if (match.kind === "english") {
    nextToken = ENGLISH_WORDS[nextLevel];
  } else {
    nextToken = /[٠-٩]/.test(match.token) ? toArabicIndicDigits(String(nextLevel)) : String(nextLevel);
  }

  return {
    promoted: true as const,
    reason: null,
    currentClassName: normalized,
    nextClassName: normalizeSpaces(normalized.replace(match.token, nextToken)),
  };
}

export type StudentPromotionPlanEntry = {
  id: string;
  fromClassName: string;
  toClassName: string;
};

export type StudentPromotionSkipEntry = {
  id: string;
  className: string;
  reason: "missing" | "unrecognized" | "terminal";
};

export function buildStudentPromotionPlan(
  students: Array<{ id: string; class_name: string | null | undefined }>,
) {
  const updates: StudentPromotionPlanEntry[] = [];
  const skipped: StudentPromotionSkipEntry[] = [];

  for (const student of students) {
    const result = promoteClassName(student.class_name);
    if (result.promoted && result.nextClassName) {
      updates.push({
        id: student.id,
        fromClassName: result.currentClassName,
        toClassName: result.nextClassName,
      });
      continue;
    }

    skipped.push({
      id: student.id,
      className: result.currentClassName,
      reason: result.reason ?? "unrecognized",
    });
  }

  return {
    updates,
    skipped,
    summary: {
      promotedCount: updates.length,
      skippedCount: skipped.length,
      terminalCount: skipped.filter((item) => item.reason === "terminal").length,
      unrecognizedCount: skipped.filter((item) => item.reason === "unrecognized").length,
      missingCount: skipped.filter((item) => item.reason === "missing").length,
    },
  };
}
