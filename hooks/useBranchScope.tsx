"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { UserProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export type ScopedBranch = {
  id: string;
  name: string;
  is_active: boolean;
};

export type BranchScopeState = {
  isMultiBranchScope: boolean;
  scopeLoading: boolean;
  branches: ScopedBranch[];
  requestedBranchId: string | null;
  selectedBranchId: string | null;
  selectedBranch: ScopedBranch | null;
  needsSelection: boolean;
  hasInvalidSelection: boolean;
  shouldBlockContent: boolean;
  setSelectedBranchId: (branchId: string | null) => void;
};

const BRANCH_SCOPE_STORAGE_KEY = "branch-scope:v1";
const BRANCH_SCOPE_CHANGE_EVENT = "branch-scope-change";
const BRANCH_SCOPE_QUERY_PARAM = "branch";

function readBranchScopeFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(BRANCH_SCOPE_QUERY_PARAM);
  } catch {
    return null;
  }
}

function readCachedBranches() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(BRANCH_SCOPE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { branches?: ScopedBranch[]; cachedAt?: number };
    if (!Array.isArray(parsed.branches) || typeof parsed.cachedAt !== "number") {
      return null;
    }
    if (Date.now() - parsed.cachedAt > 60_000) {
      return null;
    }
    return parsed.branches;
  } catch {
    return null;
  }
}

function writeCachedBranches(branches: ScopedBranch[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    BRANCH_SCOPE_STORAGE_KEY,
    JSON.stringify({ branches, cachedAt: Date.now() }),
  );
}

export function useBranchScope(profile: UserProfile | null): BranchScopeState {
  const router = useRouter();
  const pathname = usePathname();
  const isMultiBranchScope =
    profile?.role !== "super_admin" &&
    profile?.branch_id === null &&
    (profile?.allowed_branch_ids?.length ?? 0) > 0;

  const [branches, setBranches] = useState<ScopedBranch[]>([]);
  const [scopeLoading, setScopeLoading] = useState(isMultiBranchScope);
  const [requestedBranchId, setRequestedBranchId] = useState<string | null>(() =>
    readBranchScopeFromWindow(),
  );

  useEffect(() => {
    let active = true;

    async function fetchBranches() {
      if (!isMultiBranchScope || !profile?.allowed_branch_ids) {
        setBranches([]);
        setScopeLoading(false);
        return;
      }

      const cachedBranches = readCachedBranches();
      if (cachedBranches && cachedBranches.length > 0) {
        setBranches(cachedBranches);
        setScopeLoading(false);
      } else {
        setScopeLoading(true);
      }

      const { data } = await supabase
        .from("branches")
        .select("id, name, is_active")
        .in("id", profile.allowed_branch_ids)
        .order("name", { ascending: true });

      if (!active) return;

      const nextBranches = (data ?? []) as ScopedBranch[];
      setBranches(nextBranches);
      writeCachedBranches(nextBranches);
      setScopeLoading(false);
    }

    void fetchBranches();
    return () => {
      active = false;
    };
  }, [isMultiBranchScope, profile?.allowed_branch_ids]);

  useEffect(() => {
    const syncRequestedBranch = () => setRequestedBranchId(readBranchScopeFromWindow());
    syncRequestedBranch();

    window.addEventListener("popstate", syncRequestedBranch);
    window.addEventListener(BRANCH_SCOPE_CHANGE_EVENT, syncRequestedBranch);
    return () => {
      window.removeEventListener("popstate", syncRequestedBranch);
      window.removeEventListener(BRANCH_SCOPE_CHANGE_EVENT, syncRequestedBranch);
    };
  }, [pathname]);

  const selectedBranch = useMemo(() => {
    if (!isMultiBranchScope || !requestedBranchId) return null;
    return branches.find((branch) => branch.id === requestedBranchId) ?? null;
  }, [isMultiBranchScope, requestedBranchId, branches]);

  const selectedBranchId = isMultiBranchScope ? selectedBranch?.id ?? null : null;
  const hasInvalidSelection = isMultiBranchScope && !scopeLoading && Boolean(requestedBranchId) && !selectedBranch;
  const needsSelection = isMultiBranchScope && !scopeLoading && !requestedBranchId;
  const shouldBlockContent = isMultiBranchScope && !scopeLoading && !selectedBranchId;

  const setSelectedBranchId = useCallback(
    (branchId: string | null) => {
      const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
      if (branchId) {
        params.set(BRANCH_SCOPE_QUERY_PARAM, branchId);
      } else {
        params.delete(BRANCH_SCOPE_QUERY_PARAM);
      }

      const nextSearch = params.toString();
      setRequestedBranchId(branchId?.trim() || null);
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
      window.dispatchEvent(new Event(BRANCH_SCOPE_CHANGE_EVENT));
    },
    [pathname, router],
  );

  return {
    isMultiBranchScope,
    scopeLoading,
    branches,
    requestedBranchId,
    selectedBranchId,
    selectedBranch,
    needsSelection,
    hasInvalidSelection,
    shouldBlockContent,
    setSelectedBranchId,
  };
}
