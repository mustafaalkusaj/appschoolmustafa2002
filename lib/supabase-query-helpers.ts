/**
 * Supabase PostgREST query helpers for building safe filter strings.
 */

/**
 * Escape special characters in a Supabase PostgREST filter value.
 * PostgREST uses commas and parens as delimiters in `.or()` filters,
 * and percent/underscore are LIKE wildcards.
 */
export function escapeFilterValue(value: string): string {
  // Escape backslashes first, then other special chars
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "\\,")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\./g, "\\.");
}

/**
 * Build a safe `.or()` filter string for Supabase PostgREST queries.
 * Escapes special characters in the search value to prevent filter injection.
 *
 * @example
 * buildSafeOrFilter(["full_name", "class_name"], searchTerm)
 * // Returns: "full_name.ilike.%safe_term%,class_name.ilike.%safe_term%"
 */
export function buildSafeOrFilter(columns: string[], search: string): string {
  const escaped = escapeFilterValue(search.trim());
  return columns.map((col) => `${col}.ilike.%${escaped}%`).join(",");
}
