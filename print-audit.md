# Print Audit

## Method

- Print flows were exercised in the live app after real admin login.
- The app’s print implementation is centralized in `lib/print/branding.ts` and uses hidden iframe-based printing.
- A dedicated print runner attempted to capture the generated iframe contents before the native print call.

## Tested Flows

- Teacher account card print
  - Entry path worked: teachers page → `بطاقة الدخول` → account card modal
  - Print result: no `iframe[title="print-preview"]` appeared within 6 seconds
  - Status: partially verified, likely brittle or blocked in current browser/runtime behavior

- Reports summary print
  - Entry path worked: reports page → `طباعة الملخص`
  - Print result: no `iframe[title="print-preview"]` appeared within 6 seconds
  - Status: partially verified, likely brittle or blocked

- Salaries all-teachers print
  - Entry path worked: salaries page → `خيارات الطباعة` → `طباعة التقرير الشامل`
  - Print result: no `iframe[title="print-preview"]` appeared within 6 seconds
  - Status: partially verified, likely brittle or blocked

- Students filtered print
  - Entry path worked: students page → `طباعة الطلاب المفلترين`
  - Print result: the preview element path was unstable and never exposed a readable content frame for capture
  - Status: partially verified, not automation-friendly

## What Worked Before Print

- Teacher account-card modal rendered the expected credential UI before print was attempted.
- Reports summary print action was reachable from the live UI.
- Salaries print options modal opened.
- Students filtered print action was clickable.

## What Could Not Be Fully Verified

- Native print dialog behavior
- Final printable layout polish
- Clipping and pagination across pages
- Printed values versus on-screen values for receipts and reports

## Risks

- Current print paths are difficult to validate automatically and are therefore hard to trust before release.
- If print is a business-critical workflow, it needs either:
  - a deterministic preview mode
  - or headed/manual QA as a release gate

## Recommendation

- Add a stable preview route or test-mode output for each printable document so QA can validate actual rendered print content without relying on hidden iframe timing.
