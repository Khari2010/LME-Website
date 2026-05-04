# Phase 5 — RBAC + Finance + Analytics Implementation Plan

> **Context:** Built autonomously after Phases 1a + 1b + 2 + 3 + 4. Branch: `feat/phase-5-rbac-finance-analytics` from `feat/phase-4-music-team-diary`.

**Goal:** Activate the full RBAC layer (so Tanisha/Stacey/Tamara/Camara/Jabari/Jess get their scoped views), add a top-level Finance overview module (Cashflow / Invoices / Expenses / Contracts), and weave Analytics widgets across the platform.

**Spec:** `docs/superpowers/specs/2026-05-03-lme-platform-vision-design.md` §9 (Roles & permissions), §11 Phase 5.

## Tasks

### T1 — RBAC enforcement layer

The role enum already exists on `users.role` (8 values: director / admin / internal-events / marketing / production / ticketing + legacy owner / drafter). Phase 1a only wires director + admin paths. Phase 5 wires the remaining four:

- **Server-side guards** — a `requireRole(roles[])` helper called at the top of admin mutations + server pages. Throws on unauthorized.
- **Per-role sidebar visibility** — Sidebar reads role and hides nav items the role can't access.
- **Dashboard role-templated panels** — different role-default panels (already partially in place; expand to all 6 roles).

**Files:**
- `convex/auth.ts` (new) — `getCurrentUser`, `requireRole` helpers
- `src/lib/role-permissions.ts` — central permission matrix
- `src/components/crm/Sidebar.tsx` — read role from a server context, filter visible items
- `src/app/(app-domain)/dashboard/dashboard-client.tsx` — per-role panels

### T2 — Finance top-level module

Replaces the per-event Finance tab as the canonical money view. Sub-pages:

- **Cashflow** — running balance computed from booking deposits + balances + (manual) expenses. Quarter-over-quarter chart. Default view.
- **Invoices** — all events with `finance.deposit` or `finance.balance` set, grouped by paid/pending/overdue. Drill-in opens the event.
- **Expenses** — manual expense entries (new `expenses` table). Categorised, dated, optional receipt URL.
- **Contracts** — list of all events with `contract.sentAt` set, status (sent/signed/none), drill-in.

**Files:**
- `convex/schema.ts` — new `expenses` table
- `convex/expenses.ts` — CRUD
- `convex/finance.ts` — `getCashflowSummary`, `getInvoicesView`, `getContractsView` queries
- `src/app/(app-domain)/finance/page.tsx` — redirect to /finance/cashflow
- `src/app/(app-domain)/finance/cashflow/page.tsx`
- `src/app/(app-domain)/finance/invoices/page.tsx`
- `src/app/(app-domain)/finance/expenses/page.tsx`
- `src/app/(app-domain)/finance/contracts/page.tsx`
- Sidebar update (already enabled in earlier phase as a single link; expand to children)

### T3 — Analytics widgets

Cross-module analytics surfaced where they're useful:

- **Dashboard** — quarterly revenue card · upcoming events count · campaign performance · fan growth
- **External Bookings page** — pipeline conversion stats (Inquiry → Booked rate)
- **Internal Shows page** — ticket sales velocity per show
- **Marketing landing** — opens / clicks / unsub trend
- **Enhancers section** — fan growth chart

For Phase 5, ship the Convex queries that POWER analytics + a single shared `<Stat>` and `<Sparkline>` component. Wire them into Dashboard. Other consumers can pick up incrementally.

**Files:**
- `convex/analytics.ts` — `getQuarterlyRevenue`, `getCampaignSummary`, `getFanGrowth`, `getPipelineConversion`, `getTicketVelocity`
- `src/components/crm/Stat.tsx` — small KPI card
- `src/components/crm/Sparkline.tsx` — inline mini chart (SVG, no library)
- `src/app/(app-domain)/dashboard/dashboard-client.tsx` — use them

### T4 — Onboarding flow improvements

The existing `/admin/team` page (Phase 1a) lets directors invite by email. Extend to: pick a role from the dropdown matching the new RBAC enum, gate the page itself to directors only.

**Files:**
- `convex/invitationsAdmin.ts` — extend createInvitation to accept role
- `src/app/admin/(authed)/team/page.tsx` — role selector in invite form

## Out of scope

- Social Dashboard (Phase 5 task in spec, but defer — needs IG/TikTok/YouTube OAuth which is per-app heavy)
- Enhancers admin polish (out of scope for Phase 5; works today)
- Public CMS (Phase 6)

## Self-review approach

Same TDD-light pattern: implementer subagent → tsc + tests + build pass → commit. Final push + deploy notes.
