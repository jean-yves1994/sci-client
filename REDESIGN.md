# Dashboard redesign — audit and changes

## What I found (STEP 1 — audit)

| | |
|---|---|
| Framework | Next.js 14.2.18, App Router, React 18.3.1, TypeScript 5.6 |
| Styling | Tailwind 3.4 with CSS-variable design tokens |
| Charts | Hand-rolled SVG (`components/charts.tsx`) — no chart dependency |
| Theme | Light/dark/system, pre-paint script, no flash |
| Auth | Bearer token + silent refresh rotation (`lib/api.ts`) |

The design system was already in place and sound: 33 UI primitives, 4 chart
types, an application shell, 28 icons, and a semantic token layer where every
colour resolves through a CSS variable that swaps by theme.

**The defect was navigation.** The sidebar linked to 10 destinations but only
two pages existed. Eight of them — reviews, properties, reports, users,
branches, templates, analytics, audit — were dead links returning 404, plus
notifications and profile referenced from the topbar and user menu.

## What I changed

Built the 10 missing pages against the existing design system and the existing
API client. No primitive, token, endpoint or auth path was modified.

| Page | Real data source |
|---|---|
| Analytics | `/analytics/dashboard`, `/analytics/monthly`, `/analytics/by-branch`, `/analytics/by-inspector` |
| Review queue | `/reviews/queue`, `/analytics/dashboard` |
| Properties | `/properties`, `/branches`, `/users/inspectors`, POST `/inspections` |
| Reports | `/reports`, `/reports/:id/download` |
| Users | `/users`, `/branches`, reset/unlock/suspend actions |
| Branches | `/branches` |
| Templates | `/templates` |
| Audit | `/audit-logs` |
| Notifications | `/notifications`, `/notifications/read`, `/notifications/read-all` |
| Profile | `/auth/change-password` |

## On the metrics in the brief

The brief lists Total Shipments, In Transit, Riders, Revenue. Those belong to a
delivery platform, not this application — this is the collateral inspection
system, whose backend exposes inspections, review turnaround, approval rate,
properties, branches and users.

The brief itself says *"Do not blindly create metrics that don't exist in the
backend"*, so I used the real ones. Inventing a Revenue tile would have meant
either a hard-coded number or a fabricated aggregation, and a figure that
appears only in the UI is worse than no figure at all.

## Judgement calls

**Approval rate shows "No decisions yet" rather than 0%** when nothing has been
decided. Zero percent and no data are different statements, and on a lending
dashboard the difference matters.

**Percentage-change indicators are omitted, not zeroed,** when there is no
honest comparison — a single data point, or a previous period of zero.
`periodChange` returns null and the tile simply renders without a delta.

**Properties without registered coordinates are flagged.** Without them a GPS
capture can never be verified against that property, so the gap is surfaced at
the point where somebody can fix it.

**You cannot suspend your own account** — the control is hidden for the current
user, since locking yourself out of the system you administer is not a state
worth reaching through a UI affordance.

## Verification

`node verify.mjs` — 25 files, 15 routes:

- every file parses
- every local import resolves *and* names a real export
- every JSX component and helper is in scope
- `'use client'` directives and default exports correct
- **every one of 13 nav targets resolves to a real route** (was 5 of 13)
- no hard-coded palette colours — all styling goes through themed tokens, so
  dark mode cannot be bypassed by a stray `bg-gray-100`
- no unused imports

Two caveats. `npm install` was unavailable in this environment, so `tsc` never
ran against React's type definitions — treat your first `npm run typecheck` as
the real gate. And the checks above are static; I could not click through the
running application, so the responsive and dark-mode review at STEP 6 is the
one step I could not complete for you.
