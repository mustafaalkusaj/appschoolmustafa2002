export type MessageModerationResult =
  | { allowed: true }
  | { allowed: false; category: "sexual" | "threat" | "hate" };

const BLOCKED_PATTERNS: Array<{
  category: Exclude<MessageModerationResult, { allowed: true }>["category"];
  pattern: RegExp;
}> = [
  {
    category: "sexual",
    pattern:
      /(?:p\s*o\s*r\s*n(?:ography)?|xxx|nudes?|اباحي(?:ة)?|صور\s+عارية|محتوى\s+جنسي)/i,
  },
  {
    category: "threat",
    pattern:
      /(?:i\s+will\s+kill\s+you|kill\s+yourself|سوف\s+اقتلك|راح\s+اقتلك|سأقتلك|انتحر)/i,
  },
  {
    category: "hate",
    pattern:
      /(?:gas\s+the\s+(?:jews|muslims)|اقتلوا\s+(?:اليهود|المسلمين|المسيحيين))/i,
  },
];

function normalizeForModeration(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[._*~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Conservative filter for explicit high-confidence content in a school product used by minors. */
export function moderateSchoolMessage(value: string): MessageModerationResult {
  const normalized = normalizeForModeration(value);
  for (const rule of BLOCKED_PATTERNS) {
    if (rule.pattern.test(normalized))
      return { allowed: false, category: rule.category };
  }
  return { allowed: true };
}
