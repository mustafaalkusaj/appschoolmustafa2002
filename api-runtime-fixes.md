# API Runtime Fixes

## Tested API-Backed Screens

- Dashboard
- Monitoring
- Fee notifications
- Payments
- Students
- Salaries
- Reports
- Expenses
- Super admin overview

## What Failed

- RBAC/session synchronization could block or destabilize authenticated page boot.
- Teacher activity and fee-notification surfaces were too fragile when expected DB objects were missing.
- Auth header/session helpers could stall while waiting on Supabase session resolution.

## What Was Fixed

| API / Runtime Area | Fix |
| --- | --- |
| `/api/rbac/session` integration | Added timeout-aware token resolution and abort handling so auth setup does not block the app indefinitely |
| Client authorized fetches | `lib/authorized-api.ts` now resolves access tokens opportunistically with a timeout instead of hard-blocking every request |
| Teacher activity data | `messages`, `homework`, and fee-notification server helpers now degrade to empty results when optional DB objects are missing |
| Protected route boot | `hooks/useRole.tsx` no longer waits on RBAC cookie refresh before letting protected UI render |

## What Still Needs Backend Or Environment Work

- Offline behavior is still unsupported.
- Heavy API-backed routes remain slow on cold dev loads.
- Full lint debt across unrelated files still needs a separate cleanup pass.

## Verification Notes

- Monitoring and fee-notification routes rendered successfully live after the API/runtime fixes.
- Server logs showed the previously problematic teacher-activity and fee-notification requests returning `200` after the fallback changes.
