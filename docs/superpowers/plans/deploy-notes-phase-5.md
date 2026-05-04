# Phase 5 — Deploy Notes

Manual steps for shipping Phase 5 (RBAC + Finance overview + Analytics). Builds on Phases 1a + 1b + 2 + 3 + 4.

## Deploy order

1-5. Phases 1a → 1b → 2 → 3 → 4 in order
6. Merge Phase 5 → run steps below

## What Phase 5 ships

| Capability | Status | Notes |
|---|---|---|
| RBAC framework (`canSeeModule` / `canWriteModule`) | ✅ live | 8 roles × 9 modules matrix |
| Sidebar role-aware filtering | ✅ live | Server-side filter; hidden items don't reach the client |
| Dashboard role-templated panels | ✅ live | Director / Admin / Marketing / Internal Events / Production / Ticketing |
| Finance top-level module | ✅ live | Cashflow / Invoices / Expenses / Contracts |
| Cross-module analytics queries | ✅ live | quarterly revenue, pipeline conversion, campaigns, fan growth, ticket velocity |
| Stat + Sparkline components | ✅ live | Pure SVG — no chart library |
| Role selector on team invite form | ✅ live | Webhook reads invited role and applies to new users |

## 1. Convex prod push

```bash
pnpm dlx convex deploy --prod
```

Carries:
- New table: `expenses`
- Schema: `invitations.role` field added
- New modules: `auth`, `expenses`, `finance`, `analytics`
- `invitations.getPendingRoleForEmail` query exposed for webhook lookup

## 2. Update existing user roles (optional, recommended)

Phase 5 introduces 6 production roles. Existing users in prod were upserted with `role: "admin"` by the Phase 1a webhook. To reassign:

```bash
# Convex dashboard → Functions → users:setRole
# Or run directly:
pnpm dlx convex run users:setRole --args '{"clerkUserId": "user_xxx", "role": "director"}'
```

Recommended assignments per `team_roster.md`:
- Khari → director
- Chris → director
- Reuben → director
- Justin → director
- Tanisha → admin
- Stacey → internal-events
- Tamara → marketing (when she joins)
- Camara → production (when she joins)
- Jabari → production (when he joins)
- Jess → ticketing (when she joins)

## 3. Smoke test

| Step | Where | Expected |
|---|---|---|
| 1 | Sign in as a director | Sidebar shows all modules |
| 2 | Switch user's role to "ticketing" via Convex dashboard | Sign out + back in. Sidebar hides External Bookings, Marketing, Finance, Music, Enhancers |
| 3 | Switch role to "marketing" | Sidebar hides External Bookings (still visible — readable), shows Marketing + Enhancers; hides Finance |
| 4 | Director: visit `/finance/cashflow` | KPI cards + quarterly table |
| 5 | Director: visit `/finance/invoices` | Per-event finance rollup with paid/pending/overdue filter |
| 6 | Director: visit `/finance/expenses` → Add expense | Persists; appears in list; cashflow updates |
| 7 | Director: visit `/finance/contracts` | List of all events with `contract.sentAt` |
| 8 | Director: visit `/dashboard` | Stat cards: Revenue / Pipeline / Campaigns / Fan growth |
| 9 | Marketing role: visit `/dashboard` | Open rate + active fans Stat cards |
| 10 | Director: `/admin/team` → invite a test email with role=ticketing | Pending invitation row shows |
| 11 | Accept the invitation as the test user | Convex `users` row created with role=ticketing |

## 4. Known follow-ups (Phase 6+)

- Social Dashboard (deferred — needs IG/TikTok/YouTube OAuth)
- LLM transcript extraction (Phase 4 stub still pending)
- Real Xero OAuth (Phase 1b stub)
- Real Eventbrite OAuth (Phase 3 stub)
- `requireWrite` enforcement on existing mutations (currently only `expenses` mutations call it; spread it to events.update / contracts.signContract / etc. when appropriate)
- Public CMS (Phase 6)
- Production Clerk keys + `clerk.lmeband.com`
- Analytics: ticket sales trend over time per show, sponsorship pipeline funnel, campaign A/B testing
