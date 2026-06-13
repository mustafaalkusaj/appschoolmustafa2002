# Bilingual UI Review

Generated: 2026-04-09

## Arabic Mode Review

- verified routes: `/ar/login`, `/ar/dashboard`, `/ar/students`, `/ar/payments`, `/ar/salaries`
- Arabic renders in RTL on the verified routes
- login and authenticated shells both expose a visible language switcher and theme control
- Arabic typography is now loaded through `next/font` instead of blocked remote CSS
- dashboard, payments, and salaries all keep Arabic as a first-class mode rather than falling back to English-first layout assumptions

## English Mode Review

- verified routes: `/en/login`, `/en/dashboard`, `/en/students`, `/en/payments`, `/en/salaries`
- English renders in LTR on the verified routes
- visible shell text on `login`, `dashboard`, `payments`, and the default `salaries` route is now localized into English
- the updated `payments` screen now shows English route shell text, filters, table headers, archive summary, and pagination
- the updated `salaries` screen now shows English route shell text, payroll sidebar, quick access labels, summary cards, tabs, warning banner, and the default teacher table

## RTL / LTR Adaptation Notes

- topbar controls render correctly in both directions
- sidebar and internal payroll sidebar retain readable alignment in Arabic and English
- dashboard widget actions and chevron direction were updated to avoid hardcoded LTR assumptions
- table shells on verified routes are usable in both directions, although cell content can still be mixed-language when the underlying data itself is Arabic

## Language Switcher Behavior

- login exposes language switching before authentication
- authenticated shell exposes language switching globally in the topbar
- Playwright authenticated QA verified switching between Arabic and English after login on the dashboard route

## Known Edge Cases

- `payments` still has nested modal, drawer, export, and print helper strings that remain hardcoded
- `salaries` still has deeper section, modal, and helper text that remains hardcoded
- `fee-notifications` and `monitoring` still contain substantial hardcoded Arabic UI copy
- some table cell values remain Arabic in English mode because they are stored record data, not interface strings

## Overall Assessment

The bilingual experience is materially better and visibly live on the verified priority routes, but the product is not yet fully free of hardcoded UI copy across all modules.
