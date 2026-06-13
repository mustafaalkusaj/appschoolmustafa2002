# Missing Or Ambiguous Items

## Confirmed Limitations

- No direct Figma MCP/tooling was exposed in this environment, so the package is local only.
- Live visual verification completed directly for the login screen only in this audit round.
- Local manual screenshots existed for dashboard and attendance and were used as secondary visual references.

## Runtime-Dependent Or Partially Inferred Surfaces

- Payments, Monitoring, Fee Notifications, Reports, Expenses, Salaries, and Super Admin depend heavily on live data and permissions. Their structural reconstruction is code-grounded, but some final density/content combinations remain runtime-dependent.
- School-scoped super-admin views require `?school=` in the URL and therefore produce both blocked and data-ready states from the same route.
- Theme preset application is runtime-driven; the default rebuild should use the current blue/cyan baseline and keep preset catalog frames in Tokens/Archive pages.

## Legacy Or Inconsistent Areas

- `/[locale]/schools` and `/[locale]/subscriptions` are older standalone pages and visually diverge from the modern shell.
- `/[locale]/users` is only a redirect surface.
- `/[locale]/not-found`, `/[locale]/error`, and `/global-error` use simpler utility styling and should be normalized during design-system rebuild.
- Shell sizing is partially inconsistent: `components/AppSidebar.tsx` and `components/AppShellTopbar.tsx` implement a 280px sidebar offset, while `app/[locale]/globals.css` still carries a legacy `--sidebar-width: 224px` token.
- Action styling is partially inconsistent: `components/ui/button.tsx` still uses a legacy purple default/outline palette in dashboard component clusters, while the broader shell and auth layer use the newer blue/cyan semantic variables.

## Verification Gaps

- Authentication rate limiting prevented a fresh full Playwright screenshot pass across authenticated routes in this same audit session.
- Existing local manual screenshots for payments and fee-notifications appear blank and therefore were not trusted as visual source of truth.
- Breakpoints are inferred from Tailwind defaults because no custom breakpoint scale was found in repo config.
