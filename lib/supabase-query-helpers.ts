/**
 * Supabase PostgREST query helpers for building safe filter strings.
 */

/**
 * Escape a value for use inside a double-quoted PostgREST filter string.
 * Backslash-escaping delimiter characters in unquoted values does NOT work:
 * PostgREST forwards the backslash into the LIKE pattern, so a search for
 * "TEST_E2E" silently matched nothing. Per the PostgREST spec, values that
 * contain reserved characters must be double-quoted instead, and inside the
 * quotes only `"` and `\` need escaping. LIKE wildcards (% and _) are left
 * as-is — acting as wildcards is acceptable for user-facing search.
 */
export function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Build a safe `.or()` filter string for Supabase PostgREST queries.
 * Wraps each pattern in double quotes so delimiter characters in the search
 * value (commas, parens, dots) cannot break out of the filter expression.
 *
 * @example
 * buildSafeOrFilter(["full_name", "class_name"], searchTerm)
 * // Returns: 'full_name.ilike."%safe term%",class_name.ilike."%safe term%"'
 */
export function buildSafeOrFilter(columns: string[], search: string): string {
  const escaped = escapeFilterValue(search.trim());
  return columns.map((col) => `${col}.ilike."%${escaped}%"`).join(",");
}
