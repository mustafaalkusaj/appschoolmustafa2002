# SchoolOS SaaS (Next.js App Router)

Production-style starter for:
- Super Admin dashboard
- Role-based access control (RBAC)
- Fine-grained permissions
- Multi-school SaaS subscription flow

## Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Recharts

## Included Features

### RBAC + Permissions
- Roles: `super_admin`, `admin`, `employee`, `teacher`
- Permissions list:
  - `view_students`, `add_students`, `edit_students`, `delete_students`
  - `view_payments`, `add_payments`, `delete_payments`
  - `view_salaries`, `manage_salaries`
  - `manage_schools`, `manage_subscriptions`
  - `full_access`
- Every user has:
  - `user.role`
  - `user.permissions[]`
- Role templates are predefined and can be overridden per user.

### Security + Routing
- `middleware.ts` protects routes by role/session/subscription status.
- Non-active or expired school subscriptions are blocked from school portal access.
- Shared access helpers:
  - `usePermissions()`
  - `<ProtectedRoute permissions={["view_students"]}>`

### Super Admin Dashboard
- Global stats cards
- Smart insights block
- Charts (growth, revenue, top schools)
- Schools management (activate/suspend + student count)
- Subscription visibility + warning states
- Users management with permission matrix (checkbox UI)
- Notification center
- Audit log
- System settings panel
- Quick actions
- Dark/Light mode
- Loading skeletons

## Demo Accounts
Open `/login` and pick any account:
- `superadmin@saas.local` (Super Admin)
- `admin@sunrise.local` (Admin)
- `employee@sunrise.local` (Employee)
- `teacher@sunrise.local` (Teacher)
- `admin@future.local` (Admin on expired school subscription)
- `blocked@school.local` (Blocked user)

## Run
```bash
npm install
npm run dev
```

Build check:
```bash
npm run lint
npm run build
```

## Important Note
This starter currently uses in-memory mock data through providers (`src/providers/app-data-provider.tsx`) to keep the architecture clear and fast to customize.
To go production, replace provider mutations with database/API operations while preserving the same contracts.
