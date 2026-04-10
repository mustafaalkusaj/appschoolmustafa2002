# Remaining Style Violations

Generated: 2026-04-09  
Scan scope: `app`, `components`, `lib`  
Excluded: `node_modules`, `.next`, `output`, `artifacts`

## Enforcement Summary

The end-of-pass enforcement scan was rerun after the token and route-surface updates.

- raw hex literals: `351`
- hardcoded radius literals (`rounded-[NNpx]`): `160`
- hardcoded shadow literals (`shadow-[...]`): `55`
- `slate-*` / `gray-*` utility usages: `99`

These counts are repo-wide and include theme palette sources, print helpers, and untouched route groups. They are not all regressions from this pass.

## Undefined Token Scan

Runtime UI token gaps that were blocking the redesign were fixed in [`app/[locale]/globals.css`](/Users/musatafa/school-app/app/[locale]/globals.css).

Remaining unresolved token names found by the scan are:

- `font-cairo`
- `font-inter`
- `print-muted`
- `print-primary`
- `print-primary-deep`
- `print-primary-strong`
- `print-secondary`
- `print-surface`
- `print-text`

Interpretation:

- `font-cairo` and `font-inter` are expected `next/font` variables referenced from the global stylesheet.
- the `print-*` tokens are print-only tokens used by branding/receipt helpers, not missing live dashboard tokens.
- no additional missing runtime shell/card/table tokens were found after the global token repair.

## Highest-Debt Files

Current top offenders by combined scan signal:

| Count | File |
|---|---|
| 117 | [`app/[locale]/fee-notifications/page.tsx`](/Users/musatafa/school-app/app/[locale]/fee-notifications/page.tsx) |
| 112 | [`lib/brand/themes.ts`](/Users/musatafa/school-app/lib/brand/themes.ts) |
| 100 | [`app/[locale]/monitoring/page.tsx`](/Users/musatafa/school-app/app/[locale]/monitoring/page.tsx) |
| 83 | [`app/[locale]/globals.css`](/Users/musatafa/school-app/app/[locale]/globals.css) |
| 35 | [`lib/brand/colors.ts`](/Users/musatafa/school-app/lib/brand/colors.ts) |
| 29 | [`app/[locale]/super-admin/_components/OverviewTab.tsx`](/Users/musatafa/school-app/app/[locale]/super-admin/_components/OverviewTab.tsx) |
| 20 | [`app/[locale]/students/_utils.ts`](/Users/musatafa/school-app/app/[locale]/students/_utils.ts) |
| 14 | [`app/[locale]/students/_constants.ts`](/Users/musatafa/school-app/app/[locale]/students/_constants.ts) |
| 12 | [`app/[locale]/attendance/page.tsx`](/Users/musatafa/school-app/app/[locale]/attendance/page.tsx) |
| 12 | [`app/[locale]/salaries/_types.ts`](/Users/musatafa/school-app/app/[locale]/salaries/_types.ts) |
| 12 | [`app/[locale]/salaries/page.tsx`](/Users/musatafa/school-app/app/[locale]/salaries/page.tsx) |

## Priority Cleanup Order

1. `fee-notifications`
2. `monitoring`
3. `super-admin` overview
4. `attendance`
5. `salaries` deeper sections and type-driven quick-action color literals

## Notes On Intentional Or Lower-Risk Matches

- [`lib/brand/themes.ts`](/Users/musatafa/school-app/lib/brand/themes.ts) and [`lib/brand/colors.ts`](/Users/musatafa/school-app/lib/brand/colors.ts) intentionally contain palette source values and should be reviewed separately from route-surface debt.
- print helpers still use dedicated print tokens and a few raw literals that do not affect the main live app shell.
- [`app/[locale]/globals.css`](/Users/musatafa/school-app/app/[locale]/globals.css) naturally contains many token and fallback literals because it is the token source file.

## Conclusion

The blocking live-token issue is resolved. The remaining enforcement debt is concentrated in a small set of untouched or partially redesigned route groups rather than in the shared shell foundations completed in this pass.

## Final Stabilization Note

- the final print stabilization pass moved all credential, receipt, salary, and report printing into a shared hidden iframe helper
- that change improves browser-print behavior and reduces extra popup/tab churn, but it does not materially change the repo-wide token/style violation counts above
