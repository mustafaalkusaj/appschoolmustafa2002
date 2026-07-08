import type { UserProfile } from "@/lib/auth";
import { isMissingTableError } from "@/lib/admin-infrastructure";
import { readSchoolScopeFromWindow } from "@/lib/school/scope";
import { supabase } from "@/lib/supabase";

type ScopedProfile = Pick<UserProfile, "role" | "school_id" | "branch_id" | "allowed_branch_ids"> | null | undefined;
type SchoolScopeOptions = {
  selectedSchoolId?: string | null;
};

const BRANCH_CACHE_TTL_MS = 30_000;
const branchIdCache = new Map<string, { value: string | null; cachedAt: number }>();

export async function resolveSchoolIdForProfile(
  profile: ScopedProfile,
  options?: SchoolScopeOptions,
): Promise<string | null> {
  if (profile?.school_id) return profile.school_id;

  const override = options?.selectedSchoolId?.trim();
  if (override) return override;

  if (profile?.role === "super_admin") {
    return readSchoolScopeFromWindow();
  }

  return null;
}

export async function resolveBranchIdForSchool(schoolId: string | null): Promise<string | null> {
  if (!schoolId) return null;

  const cached = branchIdCache.get(schoolId);
  if (cached && Date.now() - cached.cachedAt <= BRANCH_CACHE_TTL_MS) {
    return cached.value;
  }

  const { data, error } = await supabase
    .from("branches")
    .select("id")
    .eq("school_id", schoolId)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "branches")) {
      branchIdCache.set(schoolId, { value: null, cachedAt: Date.now() });
      return null;
    }

    throw error;
  }

  const branchId = data?.id ?? null;
  branchIdCache.set(schoolId, { value: branchId, cachedAt: Date.now() });
  return branchId;
}

export async function resolveBranchIdForProfile(
  profile: ScopedProfile,
  options?: SchoolScopeOptions,
): Promise<string | null> {
  if (profile?.role !== "super_admin") {
    const assignedBranchId =
      typeof profile?.branch_id === "string" && profile.branch_id.trim().length > 0
        ? profile.branch_id.trim()
        : null;

    if (assignedBranchId) {
      return assignedBranchId;
    }

    const allowedBranchId =
      Array.isArray(profile?.allowed_branch_ids)
        ? profile.allowed_branch_ids.find(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          ) ?? null
        : null;

    if (allowedBranchId) {
      return allowedBranchId;
    }
  }

  const schoolId = await resolveSchoolIdForProfile(profile, options);
  return resolveBranchIdForSchool(schoolId);
}

export async function resolveSchoolBranchForProfile(profile: ScopedProfile, options?: SchoolScopeOptions) {
  const schoolId = await resolveSchoolIdForProfile(profile, options);

  // Reuse already-resolved schoolId — avoids calling resolveSchoolIdForProfile twice
  // for non-super_admin users with no assigned branches
  let branchId: string | null;
  if (profile?.role !== "super_admin") {
    const assignedBranchId =
      typeof profile?.branch_id === "string" && profile.branch_id.trim().length > 0
        ? profile.branch_id.trim()
        : null;
    if (assignedBranchId) {
      branchId = assignedBranchId;
    } else {
      const allowedBranchId =
        Array.isArray(profile?.allowed_branch_ids)
          ? profile.allowed_branch_ids.find(
              (value): value is string => typeof value === "string" && value.trim().length > 0,
            ) ?? null
          : null;
      branchId = allowedBranchId ?? await resolveBranchIdForSchool(schoolId);
    }
  } else {
    branchId = await resolveBranchIdForSchool(schoolId);
  }

  return {
    school_id: schoolId,
    branch_id: branchId,
  };
}

export function resetBranchIdCache(schoolId?: string | null) {
  if (schoolId) {
    branchIdCache.delete(schoolId);
    return;
  }

  branchIdCache.clear();
}
