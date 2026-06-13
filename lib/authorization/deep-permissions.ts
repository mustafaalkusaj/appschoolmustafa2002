import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DeepPermissionMap,
  PagePermissions,
  SidebarModuleNode,
  SidebarPageNode,
} from "@/types/deep-permissions";

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

type PermRow = {
  key: string;
  type: "action" | "field" | "special" | "data_scope";
  page_key: string;
  module_key: string;
  module_name_ar: string;
  module_icon: string | null;
  module_sort: number;
  page_name_ar: string;
  page_route: string;
  page_icon: string | null;
  page_sort: number;
};

// ---------------------------------------------------------------------------
// Core loader
// ---------------------------------------------------------------------------

/**
 * Loads the deep permission map and dynamic sidebar for a user.
 *
 * Steps:
 * 1. Resolve the user's school_role_id from user_profiles
 * 2. Load all permission definitions assigned to that role
 * 3. Load user-level overrides (grant/revoke)
 * 4. Merge: role permissions + overrides
 * 5. Build DeepPermissionMap keyed by page
 * 6. Build sidebar (only pages where actions.read = true)
 *
 * Falls back to empty map when the user has no school_role_id.
 */
export async function loadDeepPermissionsForUser(
  supabase: SupabaseClient,
  userId: string,
  _schoolId: string,
): Promise<{ permMap: DeepPermissionMap; sidebar: SidebarModuleNode[] }> {
  // 1. Get school_role_id
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("school_role_id")
    .eq("id", userId)
    .maybeSingle();

  const roleId: string | null = (profileData as { school_role_id: string | null } | null)?.school_role_id ?? null;

  if (!roleId) {
    return { permMap: {}, sidebar: [] };
  }

  // 2 & 3. Fetch role permissions and user overrides in parallel
  const [assignmentsResult, overridesResult] = await Promise.all([
    supabase
      .from("role_perm_assignments")
      .select(`
        perm_definitions (
          key,
          type,
          perm_pages (
            key,
            name_ar,
            route,
            icon,
            sort_order,
            perm_modules (
              key,
              name_ar,
              icon,
              sort_order
            )
          )
        )
      `)
      .eq("role_id", roleId),
    supabase
      .from("user_perm_overrides")
      .select(`
        is_granted,
        perm_definitions ( key )
      `)
      .eq("user_id", userId),
  ]);

  if (assignmentsResult.error) {
    console.error("[loadDeepPermissionsForUser] assignments error:", assignmentsResult.error);
    return { permMap: {}, sidebar: [] };
  }

  // 4. Build override map: permKey -> is_granted
  const overrideMap = new Map<string, boolean>();
  if (Array.isArray(overridesResult.data)) {
    for (const row of overridesResult.data) {
      const def = row.perm_definitions as unknown as { key: string } | null;
      if (def?.key) {
        overrideMap.set(def.key, row.is_granted as boolean);
      }
    }
  }

  // 5. Flatten assignment rows
  const allPermRows: PermRow[] = [];
  const roleGranted = new Set<string>();

  if (Array.isArray(assignmentsResult.data)) {
    for (const assignment of assignmentsResult.data) {
      const def = assignment.perm_definitions as unknown as {
        key: string;
        type: string;
        perm_pages: {
          key: string;
          name_ar: string;
          route: string;
          icon: string | null;
          sort_order: number;
          perm_modules: {
            key: string;
            name_ar: string;
            icon: string | null;
            sort_order: number;
          } | null;
        } | null;
      } | null;

      if (!def?.perm_pages?.perm_modules) continue;

      roleGranted.add(def.key);
      allPermRows.push({
        key: def.key,
        type: def.type as PermRow["type"],
        page_key: def.perm_pages.key,
        module_key: def.perm_pages.perm_modules.key,
        module_name_ar: def.perm_pages.perm_modules.name_ar,
        module_icon: def.perm_pages.perm_modules.icon,
        module_sort: def.perm_pages.perm_modules.sort_order,
        page_name_ar: def.perm_pages.name_ar,
        page_route: def.perm_pages.route,
        page_icon: def.perm_pages.icon,
        page_sort: def.perm_pages.sort_order,
      });
    }
  }

  // 6. Compute effective keys: role grants + overrides
  const effectiveKeys = new Set<string>(roleGranted);
  for (const [key, granted] of Array.from(overrideMap.entries())) {
    if (granted) {
      effectiveKeys.add(key);
    } else {
      effectiveKeys.delete(key);
    }
  }

  // 7. Build maps
  const permMap = buildPermissionMap(allPermRows, effectiveKeys);
  const sidebar = buildSidebar(allPermRows, permMap);

  return { permMap, sidebar };
}

// ---------------------------------------------------------------------------
// Build helpers
// ---------------------------------------------------------------------------

function buildPermissionMap(
  rows: PermRow[],
  effectiveKeys: Set<string>,
): DeepPermissionMap {
  const map: DeepPermissionMap = {};

  for (const row of rows) {
    if (!map[row.page_key]) {
      map[row.page_key] = { actions: {}, fields: {}, special: {}, data_scope: null };
    }

    const perms: PagePermissions = map[row.page_key];
    const isEffective = effectiveKeys.has(row.key);
    // subKey = everything after first dot: "students.view_phone" -> "view_phone"
    const subKey = row.key.indexOf(".") >= 0 ? row.key.slice(row.key.indexOf(".") + 1) : row.key;

    switch (row.type) {
      case "action":
        perms.actions[subKey] = isEffective;
        break;
      case "field":
        perms.fields[subKey] = isEffective;
        break;
      case "special":
        perms.special[subKey] = isEffective;
        break;
      case "data_scope":
        // Use highest-privilege effective scope:
        // own_class < own_grade < all
        if (isEffective) {
          const scopeValue = subKey.replace(/^scope_/, "");
          perms.data_scope = pickHigherScope(perms.data_scope, scopeValue);
        }
        break;
    }
  }

  return map;
}

const SCOPE_RANK: Record<string, number> = { own_class: 1, own_subject: 1, own_grade: 2, all: 3 };

function pickHigherScope(current: string | null, candidate: string): string {
  if (!current) return candidate;
  const currentRank = SCOPE_RANK[current] ?? 0;
  const candidateRank = SCOPE_RANK[candidate] ?? 0;
  return candidateRank > currentRank ? candidate : current;
}

function buildSidebar(rows: PermRow[], permMap: DeepPermissionMap): SidebarModuleNode[] {
  type ModuleEntry = {
    name_ar: string;
    icon: string | null;
    sort: number;
    pages: Map<string, { name_ar: string; route: string; icon: string | null; sort: number }>;
  };

  const moduleMap = new Map<string, ModuleEntry>();

  for (const row of rows) {
    const canRead = permMap[row.page_key]?.actions["read"] === true;
    if (!canRead) continue;

    if (!moduleMap.has(row.module_key)) {
      moduleMap.set(row.module_key, {
        name_ar: row.module_name_ar,
        icon: row.module_icon,
        sort: row.module_sort,
        pages: new Map(),
      });
    }

    const mod = moduleMap.get(row.module_key)!;
    if (!mod.pages.has(row.page_key)) {
      mod.pages.set(row.page_key, {
        name_ar: row.page_name_ar,
        route: row.page_route,
        icon: row.page_icon,
        sort: row.page_sort,
      });
    }
  }

  return Array.from(moduleMap.entries())
    .sort(([, a], [, b]) => a.sort - b.sort)
    .map(([moduleKey, mod]) => {
      const pages: SidebarPageNode[] = Array.from(mod.pages.entries())
        .sort(([, a], [, b]) => a.sort - b.sort)
        .map(([pageKey, page]) => ({
          key: pageKey,
          name_ar: page.name_ar,
          route: page.route,
          icon: page.icon,
        }));

      return {
        module: moduleKey,
        module_name_ar: mod.name_ar,
        icon: mod.icon,
        pages,
      } satisfies SidebarModuleNode;
    })
    .filter((mod) => mod.pages.length > 0);
}

// ---------------------------------------------------------------------------
// Permission tree loader — used by roles management UI
// ---------------------------------------------------------------------------

export async function loadPermissionTree(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("perm_modules")
    .select(`
      id, key, name_ar, icon, sort_order,
      pages:perm_pages (
        id, key, name_ar, route, icon, sort_order,
        permissions:perm_definitions (
          id, key, type, name_ar, description_ar
        )
      )
    `)
    .order("sort_order");

  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Role permission IDs loader — used by roles management UI
// ---------------------------------------------------------------------------

export async function loadRolePermissionIds(
  supabase: SupabaseClient,
  roleId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("role_perm_assignments")
    .select("permission_id")
    .eq("role_id", roleId);

  if (error) throw error;
  return (data ?? []).map((r) => r.permission_id as string);
}
