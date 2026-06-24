import type { loadDeepPermissionsForUser } from "@/lib/authorization/deep-permissions";

// Permission keys that grant control over the authorization system itself.
// Delegating any of these effectively hands out super-admin-equivalent power,
// so only a super_admin may assign them — never a tenant admin.
export function isSuperAdminOnlyPermissionKey(key: string): boolean {
  if (key === "settings.manage_roles") return true;
  const sub = key.indexOf(".") >= 0 ? key.slice(key.indexOf(".") + 1) : key;
  return sub === "change_role" || sub === "scope_all" || sub.startsWith("scope_all");
}

// Flatten an actor's DeepPermissionMap back into the dotted permission keys
// the actor effectively holds (e.g. "students.create", "payments.refund").
export function effectivePermissionKeys(
  map: Awaited<ReturnType<typeof loadDeepPermissionsForUser>>["permMap"],
): Set<string> {
  const keys = new Set<string>();
  for (const [pageKey, page] of Object.entries(map)) {
    for (const group of [page.actions, page.fields, page.special]) {
      for (const [sub, granted] of Object.entries(group)) {
        if (granted) keys.add(`${pageKey}.${sub}`);
      }
    }
    if (page.data_scope) keys.add(`${pageKey}.scope_${page.data_scope}`);
  }
  return keys;
}
