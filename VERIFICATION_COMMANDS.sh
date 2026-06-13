#!/bin/bash
# Verification Commands for Phase 3 Critical Fix
# Run these commands to verify all changes are correctly implemented

echo "=========================================="
echo "VERIFICATION COMMANDS FOR PHASE 3 FIX"
echo "=========================================="
echo ""

echo "1. Verify branchId is in RuntimeBrandingState type:"
grep -n "branchId: string | null;" /sessions/wonderful-trusting-cerf/mnt/school-app/hooks/brand/useRuntimeBranding.tsx | head -3
echo ""

echo "2. Verify branchId in context default value:"
grep -A5 "const RuntimeBrandingContext = createContext" /sessions/wonderful-trusting-cerf/mnt/school-app/hooks/brand/useRuntimeBranding.tsx | grep "branchId"
echo ""

echo "3. Verify branchId in createEmptyBrandingState():"
grep -A8 "function createEmptyBrandingState" /sessions/wonderful-trusting-cerf/mnt/school-app/hooks/brand/useRuntimeBranding.tsx | grep "branchId"
echo ""

echo "4. Verify branchId in Provider value useMemo (CRITICAL FIX):"
grep -B2 -A2 "branchId: branding.branchId" /sessions/wonderful-trusting-cerf/mnt/school-app/hooks/brand/useRuntimeBranding.tsx | grep "value = useMemo" -A6 | tail -1
echo ""

echo "5. Verify currentBranchId passed to useStudentsOperations:"
grep "currentBranchId: runtimeBranding.branchId" /sessions/wonderful-trusting-cerf/mnt/school-app/app/\[locale\]/students/page.tsx
echo ""

echo "6. Verify activeBranchIdFromUI extraction:"
grep -n "currentBranchId: activeBranchIdFromUI" /sessions/wonderful-trusting-cerf/mnt/school-app/app/\[locale\]/students/_hooks/useStudentsOperations.ts
echo ""

echo "7. Verify safe resolvedBranchId logic (NOT allowed_branch_ids[0]):"
grep -n "const resolvedBranchId = activeBranchIdFromUI" /sessions/wonderful-trusting-cerf/mnt/school-app/app/\[locale\]/students/_hooks/useStudentsOperations.ts
echo ""

echo "8. CONFIRM: No dangerous allowed_branch_ids[0] fallback:"
if grep -q "allowed_branch_ids\[0\]" /sessions/wonderful-trusting-cerf/mnt/school-app/app/\[locale\]/students/_hooks/useStudentsOperations.ts; then
  echo "❌ DANGEROUS CODE STILL PRESENT"
else
  echo "✓ CONFIRMED: allowed_branch_ids[0] fallback completely removed"
fi
echo ""

echo "9. Verify activeBranchIdFromUI in useCallback dependencies:"
grep -A1 "activeBranchIdFromUI\]" /sessions/wonderful-trusting-cerf/mnt/school-app/app/\[locale\]/students/_hooks/useStudentsOperations.ts | head -2
echo ""

echo "10. TypeScript compilation check:"
cd /sessions/wonderful-trusting-cerf/mnt/school-app && npx tsc --noEmit --skipLibCheck 2>&1 && echo "✓ TypeScript check PASSED" || echo "✗ TypeScript check FAILED"
echo ""

echo "=========================================="
echo "ALL VERIFICATION CHECKS COMPLETE"
echo "=========================================="
