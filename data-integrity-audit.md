# Data Integrity Audit

## Confirmed Mismatches

- Students summary versus students list is inconsistent for the same school and active filter:
  - `GET /api/web/students/meta?schoolId=...&status=active`
    - `summary.totalStudents = 1000`
    - `summary.activeStudents = 505`
    - `tabCounts.active = 30009`
  - `GET /api/web/students/list?schoolId=...&page=1&pageSize=10&status=active`
    - `totalCount = 30009`

- The “active” students filter is not respected by the students list:
  - First 10 returned statuses under `status=active` were:
    - `active`
    - `withdrawn`
    - `active`
    - `graduated`
    - `graduated`
    - `archived`
    - `archived`
    - `active`
    - `active`
    - `withdrawn`

- Students totals disagree across product areas:
  - students meta `summary.totalStudents = 1000`
  - students active tab count `30009`
  - payments meta `summary.totalStudents = 30010`
  - payments students list `totalCount = 30010`

- Super-admin overview has duplicate active subscriptions for the main school:
  - school `00000000-0000-0000-0000-000000000001` appeared twice in the active subscription list

- Super-admin overview exposes a local-file logo URL for the main school:
  - `file:///Users/musatafa/Library/Mobile Documents/...`
  - This is not portable application data

## Confirmed Consistency

- Reports overview metrics matched payments meta on the main totals:
  - `studentsCount = 30010`
  - `totalFees = 11769234333`
  - `totalRemaining = 5477445028`

- Payments list total matched payments meta total students:
  - `30010`

## Functional Integrity Risks

- Any workflow or report relying on “active students” is currently untrustworthy because the active filter returns archived, graduated, and withdrawn records.
- Students KPIs on the students screen cannot be trusted until the summary logic and list logic are aligned.
- Super-admin subscription counts cannot be trusted until duplicate active subscriptions are deduplicated or explained.

## Not Fully Verified

- Printed totals and printed receipts versus on-screen values were not fully comparable because the print flows did not expose stable preview content to automation.
- Create and update propagation was intentionally kept non-destructive, so this audit did not mutate billing records to verify post-save recomputation.
