import type { UserProfile } from "@/lib/auth";
import { isMissingTableError } from "@/lib/admin-infrastructure";
import { supabase } from "@/lib/supabase";
import { readSchoolScopeFromWindow } from "@/lib/school-scope";

type ScopedProfile = Pick<UserProfile, "role" | "school_id"> | null | undefined;
type SchoolScopeOptions = {
  selectedSchoolId?: string | null;
};

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

  const { data, error } = await supabase
    .from("branches")
    .select("id")
    .eq("school_id", schoolId)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "branches")) {
      return null;
    }

    throw error;
  }
  return data?.id ?? null;
}

export async function resolveSchoolBranchForProfile(profile: ScopedProfile, options?: SchoolScopeOptions) {
  const schoolId = await resolveSchoolIdForProfile(profile, options);
  const branchId = await resolveBranchIdForSchool(schoolId);

  return {
    school_id: schoolId,
    branch_id: branchId,
  };
}
