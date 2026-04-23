import { resolveWebUserProfile } from "@/lib/authorization/snapshot";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import {
  hasPermissionInList,
  type Permission,
} from "@/types/roles";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

export async function routeUserHasPermission(
  actorSupabase: RouteSupabaseClient,
  actorUserId: string,
  permission: Permission,
) {
  const actorProfile = await resolveWebUserProfile(actorSupabase, actorUserId).catch(() => null);
  if (!actorProfile) {
    return false;
  }

  return hasPermissionInList(actorProfile.snapshot.permissions, permission);
}
