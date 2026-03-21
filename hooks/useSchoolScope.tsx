"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { UserProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  SCHOOL_SCOPE_CHANGE_EVENT,
  SUPER_ADMIN_SCHOOL_QUERY_PARAM,
  buildLocalizedScopedPath,
  readSchoolScopeFromWindow,
} from "@/lib/school-scope";

export type ScopedSchool = {
  id: string;
  name: string;
  is_active: boolean;
  city?: string | null;
};

export type SchoolScopeState = {
  isSuperAdminScope: boolean;
  scopeLoading: boolean;
  schools: ScopedSchool[];
  requestedSchoolId: string | null;
  selectedSchoolId: string | null;
  selectedSchool: ScopedSchool | null;
  needsSelection: boolean;
  hasInvalidSelection: boolean;
  shouldBlockContent: boolean;
  setSelectedSchoolId: (schoolId: string | null) => void;
  buildLocalizedPath: (pathname: string, locale?: string) => string;
};

export function useSchoolScope(profile: UserProfile | null): SchoolScopeState {
  const router = useRouter();
  const pathname = usePathname();
  const isSuperAdminScope = profile?.role === "super_admin";
  const [schools, setSchools] = useState<ScopedSchool[]>([]);
  const [scopeLoading, setScopeLoading] = useState(isSuperAdminScope);
  const [requestedSchoolId, setRequestedSchoolId] = useState<string | null>(() => readSchoolScopeFromWindow());

  useEffect(() => {
    let active = true;

    async function fetchSchools() {
      if (!isSuperAdminScope) {
        setSchools([]);
        setScopeLoading(false);
        return;
      }

      setScopeLoading(true);
      const { data } = await supabase
        .from("schools")
        .select("id, name, is_active, city")
        .order("name", { ascending: true });

      if (!active) return;

      setSchools((data ?? []) as ScopedSchool[]);
      setScopeLoading(false);
    }

    void fetchSchools();
    return () => {
      active = false;
    };
  }, [isSuperAdminScope]);

  useEffect(() => {
    const syncRequestedSchool = () => setRequestedSchoolId(readSchoolScopeFromWindow());
    syncRequestedSchool();

    window.addEventListener("popstate", syncRequestedSchool);
    window.addEventListener(SCHOOL_SCOPE_CHANGE_EVENT, syncRequestedSchool);
    return () => {
      window.removeEventListener("popstate", syncRequestedSchool);
      window.removeEventListener(SCHOOL_SCOPE_CHANGE_EVENT, syncRequestedSchool);
    };
  }, [pathname]);

  const selectedSchool = useMemo(() => {
    if (!isSuperAdminScope || !requestedSchoolId) return null;
    return schools.find((school) => school.id === requestedSchoolId) ?? null;
  }, [isSuperAdminScope, requestedSchoolId, schools]);

  const selectedSchoolId = isSuperAdminScope ? selectedSchool?.id ?? null : profile?.school_id ?? null;
  const hasInvalidSelection = isSuperAdminScope && !scopeLoading && Boolean(requestedSchoolId) && !selectedSchool;
  const needsSelection = isSuperAdminScope && !scopeLoading && !requestedSchoolId;
  const shouldBlockContent = isSuperAdminScope && !scopeLoading && !selectedSchoolId;

  const setSelectedSchoolId = useCallback(
    (schoolId: string | null) => {
      const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
      if (schoolId) {
        params.set(SUPER_ADMIN_SCHOOL_QUERY_PARAM, schoolId);
      } else {
        params.delete(SUPER_ADMIN_SCHOOL_QUERY_PARAM);
      }

      const nextSearch = params.toString();
      setRequestedSchoolId(schoolId?.trim() || null);
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
      window.dispatchEvent(new Event(SCHOOL_SCOPE_CHANGE_EVENT));
    },
    [pathname, router],
  );

  const buildLocalizedPath = useCallback(
    (targetPath: string, locale = "ar") => buildLocalizedScopedPath(targetPath, locale, selectedSchoolId),
    [selectedSchoolId],
  );

  return {
    isSuperAdminScope,
    scopeLoading,
    schools,
    requestedSchoolId,
    selectedSchoolId,
    selectedSchool,
    needsSelection,
    hasInvalidSelection,
    shouldBlockContent,
    setSelectedSchoolId,
    buildLocalizedPath,
  };
}
