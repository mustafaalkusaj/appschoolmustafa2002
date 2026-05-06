/**
 * Text Normalization Utilities
 * Handles Arabic text normalization for duplicate detection
 */

/**
 * Normalize Arabic text for duplicate detection
 * - Trim whitespace
 * - Collapse multiple spaces to single space
 * - Normalize alef variants: أ/إ/آ → ا
 * - Normalize ya variants: ى → ي
 * - Remove diacritics (tashkeel)
 * - Lowercase for comparison
 */
export function normalizeArabicText(text: string): string {
  if (!text || typeof text !== "string") return "";

  return (
    text
      // Trim leading/trailing whitespace
      .trim()
      // Collapse multiple spaces to single space
      .replace(/\s+/g, " ")
      // Normalize alef variants: أ/إ/آ → ا
      .replace(/[أإآ]/g, "ا")
      // Normalize ya variants: ى → ي
      .replace(/ى/g, "ي")
      // Remove diacritics (tashkeel):
      // ــَ (fatha), ــِ (kasra), ــُ (damma), ــّ (shadda),
      // ــْ (sukun), ــً (fathatan), ــٍ (kasratan), ــٌ (dammatan)
      .replace(/[\u064B-\u0652]/g, "")
      // Normalize hamza on waw: ؤ → و
      .replace(/ؤ/g, "و")
      // Lowercase for case-insensitive comparison
      .toLowerCase()
  );
}

/**
 * Normalize class name for duplicate detection
 * - Uses Arabic text normalization
 * - Handles common variations like "الاول" vs "الأول"
 */
export function normalizeClassName(className: string): string {
  return normalizeArabicText(className);
}

/**
 * Normalize full name for duplicate detection
 * - Uses Arabic text normalization
 */
export function normalizeFullName(fullName: string): string {
  return normalizeArabicText(fullName);
}

/**
 * Normalize section for duplicate detection
 * - Uses Arabic text normalization
 * - Treats empty/whitespace-only sections as empty string
 */
export function normalizeSection(section: string | null | undefined): string {
  if (!section) return "";
  const normalized = normalizeArabicText(section);
  return normalized || "";
}
