import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type UserScope = "branch" | "group" | "super_admin";

export async function getUserScope(userId: string): Promise<UserScope> {
  const serviceClient = getServiceClient();
  const { data } = await serviceClient
    .from("user_profiles")
    .select("scope, role")
    .eq("id", userId)
    .single();
  if (!data) return "branch";
  if (data.role === "super_admin") return "super_admin";
  return (data.scope as UserScope) ?? "branch";
}

export async function getBranchFilter(
  userId: string
): Promise<{ branch_id: string } | null> {
  const scope = await getUserScope(userId);
  if (scope !== "branch") return null;
  const serviceClient = getServiceClient();
  const { data } = await serviceClient
    .from("user_profiles")
    .select("branch_id")
    .eq("id", userId)
    .single();
  if (!data?.branch_id) return null;
  return { branch_id: data.branch_id };
}

export async function getGroupBranches(userId: string): Promise<string[]> {
  const serviceClient = getServiceClient();
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("group_id")
    .eq("id", userId)
    .single();
  if (!profile?.group_id) return [];
  const { data: branches } = await serviceClient
    .from("branches")
    .select("id")
    .eq("group_id", profile.group_id)
    .eq("is_active", true);
  return (branches ?? []).map((b) => b.id);
}
