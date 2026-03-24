import type { UserProfile } from "@/lib/auth";
import { isMissingTableError } from "@/lib/admin-infrastructure";
import { supabase } from "@/lib/supabase";
import { readSchoolScopeFromWindow } from "@/lib/school-scope";

type ScopedProfile = Pick<UserProfile, "role" | "school_id"> | null | undefined;
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

  if (profile?.role === "super_admin") {
    return options?.selectedSchoolId?.trim() || readSchoolScopeFromWindow();
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

export async function resolveSchoolBranchForProfile(profile: ScopedProfile, options?: SchoolScopeOptions) {
  const schoolId = await resolveSchoolIdForProfile(profile, options);
  const branchId = await resolveBranchIdForSchool(schoolId);

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
