import { resolveWebUserProfile } from "@/lib/authorization/snapshot";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import {
  hasPermissionInList,
  type Permission,
} from "@/types/roles";
import { cookies } from "next/headers";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

export async function routeUserHasPermission(
  actorSupabase: RouteSupabaseClient,
  actorUserId: string,
  permission: Permission,
) {
  // Fast path: read permissions from the RBAC session cookie (no DB query)
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(RBAC_COOKIE_NAME)?.value;
    if (token) {
      const session = await verifyRBACSession(token);
      if (session && session.userId === actorUserId) {
        return hasPermissionInList(session.permissions, permission);
      }
    }
  } catch {
    // fall through to DB path
  }

  // Slow path: RBAC cookie missing or invalid — fetch from DB
  const actorProfile = await resolveWebUserProfile(actorSupabase, actorUserId).catch(() => null);
  if (!actorProfile) {
    return false;
  }

  return hasPermissionInList(actorProfile.snapshot.permissions, permission);
}
