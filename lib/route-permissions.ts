import { createRouteSupabaseClient } from "@/lib/supabase-server";
import {
  hasPermissionInList,
  normalizePermissions,
  resolveKnownUserRole,
  type Permission,
} from "@/types/roles";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

export async function routeUserHasPermission(
  actorSupabase: RouteSupabaseClient,
  actorUserId: string,
  permission: Permission,
) {
  const { data: actorProfile, error } = await actorSupabase
    .from("user_profiles")
    .select("role, custom_permissions, permissions")
    .eq("id", actorUserId)
    .maybeSingle();

  if (error || !actorProfile) {
    return false;
  }

  const role = resolveKnownUserRole(actorProfile.role);
  if (!role) {
    return false;
  }

  const profileWithPermissions = actorProfile as {
    custom_permissions?: unknown;
    permissions?: unknown;
  };
  const rawPermissions =
    Array.isArray(profileWithPermissions.custom_permissions) && profileWithPermissions.custom_permissions.length > 0
      ? profileWithPermissions.custom_permissions
      : profileWithPermissions.permissions;

  return hasPermissionInList(normalizePermissions(rawPermissions, role), permission);
}
