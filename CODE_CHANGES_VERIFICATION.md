# Code Changes Verification - Phase 3 Critical Fix

## Change 1: hooks/brand/useRuntimeBranding.tsx - RuntimeBrandingState Type

**Before:**
```typescript
type RuntimeBrandingState = {
  schoolName: string | null;
  logoUrl: string | null;
  branchName: string | null;
  branchLogoUrl: string | null;
  // ... other properties
};
```

**After:**
```typescript
type RuntimeBrandingState = {
  schoolName: string | null;
  logoUrl: string | null;
  branchId: string | null;           // ← ADDED
  branchName: string | null;
  branchLogoUrl: string | null;
  // ... other properties
};
```

**Location:** Line 26-38 in `hooks/brand/useRuntimeBranding.tsx`

---

## Change 2: hooks/brand/useRuntimeBranding.tsx - Context Default Value

**Before:**
```typescript
const RuntimeBrandingContext = createContext<RuntimeBrandingState>({
  schoolName: null,
  logoUrl: null,
  branchName: null,
  branchLogoUrl: null,
  // ...
});
```

**After:**
```typescript
const RuntimeBrandingContext = createContext<RuntimeBrandingState>({
  schoolName: null,
  logoUrl: null,
  branchId: null,           // ← ADDED
  branchName: null,
  branchLogoUrl: null,
  // ...
});
```

**Location:** Line 60-72 in `hooks/brand/useRuntimeBranding.tsx`

---

## Change 3: hooks/brand/useRuntimeBranding.tsx - createEmptyBrandingState()

**Before:**
```typescript
function createEmptyBrandingState(): RuntimeBrandingState {
  return {
    schoolName: null,
    logoUrl: null,
    branchName: null,
    branchLogoUrl: null,
    // ...
  };
}
```

**After:**
```typescript
function createEmptyBrandingState(): RuntimeBrandingState {
  return {
    schoolName: null,
    logoUrl: null,
    branchId: null,           // ← ADDED
    branchName: null,
    branchLogoUrl: null,
    // ...
  };
}
```

**Location:** Line 74-88 in `hooks/brand/useRuntimeBranding.tsx`

---

## Change 4: hooks/brand/useRuntimeBranding.tsx - setBranding calls

**Location 1 (line 293-305 - error case):**
```typescript
setBranding({
  schoolName: null,
  logoUrl: null,
  branchId: scopedBranchId,    // ← ADDED
  branchName: resolvedBranchName,
  branchLogoUrl: resolvedBranchLogoUrl,
  // ...
});
```

**Location 2 (line 377-389 - success case):**
```typescript
setBranding({
  schoolName: typeof schoolRecord.name === "string" ? schoolRecord.name : null,
  logoUrl: safeLogoUrl,
  branchId: scopedBranchId,    // ← ADDED
  branchName: resolvedBranchName,
  branchLogoUrl: resolvedBranchLogoUrl,
  // ...
});
```

---

## Change 5: hooks/brand/useRuntimeBranding.tsx - Provider value useMemo (CRITICAL FIX)

**Before:**
```typescript
const value = useMemo(() => {
  const schoolName = branding.schoolName?.trim() || null;
  const branchName = branding.branchName?.trim() || null;
  return {
    schoolName,
    logoUrl: branding.logoUrl,
    branchName,
    branchLogoUrl: branding.branchLogoUrl,
    // ... other properties without branchId
  };
}, [branding]);
```

**After:**
```typescript
const value = useMemo(() => {
  const schoolName = branding.schoolName?.trim() || null;
  const branchName = branding.branchName?.trim() || null;
  return {
    schoolName,
    logoUrl: branding.logoUrl,
    branchId: branding.branchId,      // ← CRITICAL FIX ADDED
    branchName,
    branchLogoUrl: branding.branchLogoUrl,
    // ... other properties
  };
}, [branding]);
```

**Location:** Line 415-430 in `hooks/brand/useRuntimeBranding.tsx`
**Importance:** This was the missing piece causing TypeScript compilation error. Without this, the value object passed to RuntimeBrandingContext.Provider was missing the required branchId property.

---

## Change 6: hooks/brand/useRuntimeBranding.tsx - useRuntimeBranding hook

**Already correct (no change needed):**
```typescript
export function useRuntimeBranding() {
  const context = useContext(RuntimeBrandingContext);
  if (!context) {
    return {
      schoolName: SCHOOL_BRAND.nameAr,
      logoUrl: null,
      branchId: null,                    // ✓ Already present
      branchName: null,
      // ...
    };
  }
  return {
    schoolName: context.schoolName || SCHOOL_BRAND.nameAr,
    logoUrl: context.logoUrl,
    branchId: context.branchId,          // ✓ Already present
    branchName: context.branchName,
    // ...
  };
}
```

**Location:** Line 440-470 in `hooks/brand/useRuntimeBranding.tsx`
**Status:** Already correctly implemented in previous fix phase

---

## Change 7: app/[locale]/students/page.tsx - Pass currentBranchId

**Before:**
```typescript
const operations = useStudentsOperations({
  profile,
  selectedSchoolId: schoolScope.selectedSchoolId,
  classFees,
  canEditStudents,
  canDeleteStudents,
  canManageStudentAccounts,
  activeTab,
  setActiveTab,
  locale,
  runtimeBranding,
  currentBranchId: runtimeBranding.branchId,   // ← Missing or existing?
  modals: { /* ... */ },
  reload,
});
```

**Verification:** Line 112 contains `currentBranchId: runtimeBranding.branchId,`
**Status:** ✓ Already correctly implemented

---

## Change 8: app/[locale]/students/_hooks/useStudentsOperations.ts - Interface

**Before:**
```typescript
interface UseStudentsOperationsOptions {
  profile: UserProfile | null;
  selectedSchoolId: string | null;
  // ... other options
  // NO currentBranchId property
}
```

**After:**
```typescript
interface UseStudentsOperationsOptions {
  profile: UserProfile | null;
  selectedSchoolId: string | null;
  // ... other options
  currentBranchId: string | null;      // ← ADDED
}
```

**Location:** Line 28 in `app/[locale]/students/_hooks/useStudentsOperations.ts`

---

## Change 9: app/[locale]/students/_hooks/useStudentsOperations.ts - Extract parameter

**Before:**
```typescript
export function useStudentsOperations(options: UseStudentsOperationsOptions) {
  const { profile, selectedSchoolId, classFees, /* ... */ } = options;
  // NO currentBranchId extraction
```

**After:**
```typescript
export function useStudentsOperations(options: UseStudentsOperationsOptions) {
  const { profile, selectedSchoolId, classFees, /* ... */, currentBranchId: activeBranchIdFromUI } = options;
  // ← ADDED extraction with rename to activeBranchIdFromUI
```

**Location:** Line 99 in `app/[locale]/students/_hooks/useStudentsOperations.ts`

---

## Change 10: app/[locale]/students/_hooks/useStudentsOperations.ts - CRITICAL: Remove dangerous fallback

**Before:**
```typescript
const handleAdd = useCallback(async (form: StudentFormData) => {
  // ...
  const currentBranchId = profile?.branch_id || profile?.allowed_branch_ids?.[0] || null;
  // ↑ DANGEROUS: Silently falls back to first branch for multi-branch users
  if (!currentBranchId) {
    // error handling
  }
  // ...
  const payload = { /* ... */, branch_id: currentBranchId };
}, [/* dependencies */]);
```

**After:**
```typescript
const handleAdd = useCallback(async (form: StudentFormData) => {
  // ...
  // Priority: UI context > profile.branch_id (for single-branch users)
  const resolvedBranchId = activeBranchIdFromUI ?? profile?.branch_id ?? null;
  // ↑ SAFE: Uses UI context first, never falls back to allowed_branch_ids[0]
  if (!resolvedBranchId) {
    const errorMsg = locale === "en"
      ? "Could not determine the current branch. Please ensure a branch is selected in the sidebar."
      : "تعذر تحديد الفرع الحالي. يرجى التأكد من اختيار فرع في القائمة الجانبية.";
    modals.setError(errorMsg);
    modals.setSaving(false);
    return;
  }
  // ...
  const payload = { /* ... */, branch_id: resolvedBranchId };
}, [/* ... activeBranchIdFromUI ... */]);
```

**Location:** Line 219-225 in `app/[locale]/students/_hooks/useStudentsOperations.ts`
**Importance:** This is the core fix - removes the dangerous fallback and uses UI context instead

---

## Change 11: app/[locale]/students/_hooks/useStudentsOperations.ts - useCallback dependencies

**Before:**
```typescript
}, [canManageStudentAccounts, copy.addSchoolBranchFirst, copy.createFailed, copy.createdSuccess, copy.noCreatePermission, getSchoolBranch, modals, reload, profile, locale]);
// ↑ NO activeBranchIdFromUI
```

**After:**
```typescript
}, [canManageStudentAccounts, copy.addSchoolBranchFirst, copy.createFailed, copy.createdSuccess, copy.noCreatePermission, getSchoolBranch, modals, reload, profile, locale, activeBranchIdFromUI]);
// ↑ ADDED activeBranchIdFromUI
```

**Location:** Line 271 in `app/[locale]/students/_hooks/useStudentsOperations.ts`
**Importance:** Ensures callback updates when active branch changes in UI

---

## Summary of Changes

| File | Change | Type | Status |
|------|--------|------|--------|
| useRuntimeBranding.tsx | Add branchId to RuntimeBrandingState type | Type definition | ✓ Implemented |
| useRuntimeBranding.tsx | Add branchId to context default | Context setup | ✓ Implemented |
| useRuntimeBranding.tsx | Add branchId to factory function | Factory | ✓ Implemented |
| useRuntimeBranding.tsx | Add branchId in setBranding calls | State setter | ✓ Implemented |
| useRuntimeBranding.tsx | **Add branchId to Provider value useMemo** | **Context provider** | **✓ CRITICAL FIX** |
| useRuntimeBranding.tsx | branchId in hook fallback return | Hook | ✓ Already present |
| useRuntimeBranding.tsx | branchId in hook success return | Hook | ✓ Already present |
| students/page.tsx | Pass currentBranchId to useStudentsOperations | Component prop | ✓ Implemented |
| useStudentsOperations.ts | Add currentBranchId to interface | Type interface | ✓ Implemented |
| useStudentsOperations.ts | Extract currentBranchId as activeBranchIdFromUI | Parameter extraction | ✓ Implemented |
| useStudentsOperations.ts | Replace dangerous fallback with safe resolution | Core logic | ✓ Implemented |
| useStudentsOperations.ts | Add activeBranchIdFromUI to dependencies | Hook dependencies | ✓ Implemented |

---

## Verification Results

✓ All changes implemented
✓ No dangerous fallbacks remain
✓ TypeScript compilation successful
✓ Type safety complete across all code paths
✓ Error handling in place for missing branch
✓ Component context properly threaded
✓ Hook dependencies properly updated
✓ i18n support maintained (English + Arabic)

