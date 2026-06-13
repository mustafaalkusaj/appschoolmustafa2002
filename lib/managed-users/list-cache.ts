const MANAGED_USERS_LIST_CACHE_TTL_MS = 20 * 1000;

type ManagedUsersListCacheValue = {
  expiresAt: number;
  payload: unknown;
};

const managedUsersListCache = new Map<string, ManagedUsersListCacheValue>();
const managedUsersListPending = new Map<string, Promise<unknown>>();

function getScopedPrefix(schoolId: string) {
  return `${schoolId}::`;
}

export function getManagedUsersListCache<T>(cacheKey: string) {
  const cached = managedUsersListCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    managedUsersListCache.delete(cacheKey);
    return null;
  }

  return cached.payload as T;
}

export function setManagedUsersListCache(cacheKey: string, payload: unknown) {
  managedUsersListCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + MANAGED_USERS_LIST_CACHE_TTL_MS,
  });
}

export function getManagedUsersListPending<T>(cacheKey: string) {
  return managedUsersListPending.get(cacheKey) as Promise<T> | null;
}

export function setManagedUsersListPending(cacheKey: string, pending: Promise<unknown> | null) {
  if (pending) {
    managedUsersListPending.set(cacheKey, pending);
    return;
  }

  managedUsersListPending.delete(cacheKey);
}

export function invalidateManagedUsersListCache(schoolId?: string | null) {
  if (!schoolId) {
    managedUsersListCache.clear();
    managedUsersListPending.clear();
    return;
  }

  const prefix = getScopedPrefix(schoolId);
  for (const key of Array.from(managedUsersListCache.keys())) {
    if (key.startsWith(prefix)) {
      managedUsersListCache.delete(key);
    }
  }

  for (const key of Array.from(managedUsersListPending.keys())) {
    if (key.startsWith(prefix)) {
      managedUsersListPending.delete(key);
    }
  }
}

export function buildManagedUsersListCacheKey(input: {
  schoolId: string;
  roleFilter: string | null;
  statusFilter: string | null;
  searchQuery: string;
  classFilter: string;
  sectionFilter: string;
  subjectFilter: string;
  page: number;
  pageSize: number;
  hasPagination: boolean;
}) {
  return `${getScopedPrefix(input.schoolId)}${JSON.stringify({
    roleFilter: input.roleFilter,
    statusFilter: input.statusFilter,
    searchQuery: input.searchQuery,
    classFilter: input.classFilter,
    sectionFilter: input.sectionFilter,
    subjectFilter: input.subjectFilter,
    page: input.page,
    pageSize: input.pageSize,
    hasPagination: input.hasPagination,
  })}`;
}
