import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

function getService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type LayoutMode = "full" | "focused";
export type UserScope = "super_admin" | "group" | "branch" | "focused";

export interface UserAccess {
  layoutMode: LayoutMode;
  allowedModules: string[];
  branchId: string | null;
  groupId: string | null;
  scope: UserScope;
}

export const getUserAccess = cache(async (userId: string): Promise<UserAccess> => {
  const service = getService();

  const { data: profile } = await service
    .from("user_profiles")
    .select("role, scope, branch_id, group_id")
    .eq("id", userId)
    .single();

  if (!profile) {
    return { layoutMode: "focused", allowedModules: [], branchId: null, groupId: null, scope: "focused" };
  }

  if (profile.role === "super_admin") {
    return { layoutMode: "full", allowedModules: ["all"], branchId: null, groupId: null, scope: "super_admin" };
  }

  const { data: permissions } = await service
    .from("user_permissions")
    .select("module, branch_id")
    .eq("user_id", userId);

  const modules = (permissions ?? []).map((p: { module: string; branch_id: string | null }) => p.module);
  const hasFull = modules.includes("all");
  const isGroupScope = profile.scope === "group";

  if (hasFull || isGroupScope) {
    return {
      layoutMode: "full",
      allowedModules: hasFull ? ["all"] : modules,
      branchId: profile.branch_id ?? null,
      groupId: profile.group_id ?? null,
      scope: isGroupScope ? "group" : "branch",
    };
  }

  return {
    layoutMode: modules.length === 1 ? "focused" : "full",
    allowedModules: modules,
    branchId: profile.branch_id ?? null,
    groupId: profile.group_id ?? null,
    scope: "focused",
  };
});
