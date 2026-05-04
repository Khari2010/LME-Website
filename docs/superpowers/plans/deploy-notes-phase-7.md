# Phase 7 — Deploy Notes (Bug-hunt + Polish)

Manual steps for shipping Phase 7 (security fixes + email polish + mobile UX). Builds on Phases 1a–6.

## Why this phase exists

Mid-Phase-6 dev-server walkthrough surfaced 14 cross-phase bugs in a deliberate read-only review. **6 were CRITICAL** including a GDPR-level data leak (every Convex query was unauthenticated — anyone with the public Convex URL could dump contacts, events, finance data). This phase fixes them, then layers on email-template polish and mobile responsiveness.

## Deploy order

1-6. Phases 1a → 1b → 2 → 3 → 4 → 5 → 6 in order
7. Merge Phase 7 → run steps below

## CRITICAL — required before going to production

### 1. Set `RESEND_WEBHOOK_SECRET`

Phase 7 added Svix signature verification on `/api/resend/webhook`. **The webhook will reject all events with HTTP 400 until this env var is set.** That means: no campaign metrics, no auto-suppression, no email events surfaced.

```bash
# 1. Resend dashboard → Webhooks → register https://www.lmeband.com/api/resend/webhook
#    (same URL as before; the Svix signature verification is new on our side)
# 2. Copy the signing secret Resend shows you
# 3. Set in Vercel env vars:
RESEND_WEBHOOK_SECRET=whsec_xxxx
```

Test by triggering a campaign send → check Convex logs for the webhook firing successfully.

### 2. Re-verify role assignments

Phase 7 fix #5 stops the Clerk webhook from overwriting `role` on `user.updated`. Existing Convex `users` rows are unaffected, but this means **going forward, role changes happen ONLY via**:

- Initial signup (webhook reads `invitations.role` and sets it once)
- Manual admin action via `users.setRole` mutation in Convex dashboard

Audit your current `users` table after deploy:

```bash
pnpm dlx convex run users:listUsers
```

Confirm Khari/Chris/Reuben/Justin have role=`director` (not `admin` from the legacy demote-on-update behaviour).

### 3. Deploy environment guard for VITEST bypass

Phase 7 fix #6 tightened the test-mode bypass so it only fires on non-prod Convex deployments. **No action needed if you're using `prod:` deployment names** (the standard).

## What Phase 7 ships

| Capability | Status | Notes |
|---|---|---|
| `requireAuth` on 37 admin queries | ✅ live | GDPR-level fix; portal pages use new token-gated `events.getByIdForPortal` |
| Resend webhook signature verification | ✅ live | Requires `RESEND_WEBHOOK_SECRET` |
| `recordCampaignEvent` and contact mutations gated | ✅ live | No more public spam-suppression vector |
| Campaign sender double-send race fixed | ✅ live | `claimScheduledForSend` atomically locks before fire |
| Webhook role-overwrite fixed | ✅ live | Director won't be demoted to admin on profile edit |
| VITEST bypass tightened | ✅ live | Only bypasses in non-prod Convex deployments |
| Notes save-on-blur clobber fixed | ✅ live | Resync only on event navigation |
| Email actions throw on missing API key | ✅ live | Surfaces failures in Convex logs |
| Merge-tag XSS in campaigns fixed | ✅ live | Auto-escaped via React Email JSX |
| 6 emails migrated to React Email components | ✅ live | Branded, plain-text fallback, per-template files in `convex/emailTemplates/` |
| Mobile sidebar drawer | ✅ live | Hamburger on phones; desktop unchanged |
| Pipeline kanban horizontal scroll | ✅ live | `minmax(220px, 1fr)` columns; readable on phones |
| Touch-friendly D&D fallback | ✅ live | Hides ⋮⋮ grip on touch; arrow buttons larger on mobile |

## Convex prod push

```bash
pnpm dlx convex deploy --prod
```

Carries:
- New helpers: `auth.requireAuth`, `auth.isTestOrDev`
- New query: `events.getByIdForPortal` (token-gated)
- 37 queries gated with `requireAuth`
- 4 newly internal queries (post-Phase-7 they don't need to be public): `listDueScheduled`, `listDueEnrollments`, `getActiveContactsForSendInternal`, etc.
- New mutation: `campaigns.claimScheduledForSend`
- Rebuilt `users.upsertUser` handles optional role correctly

## Smoke test

| Step | Where | Expected |
|---|---|---|
| 1 | Sign out, then `curl https://judicious-lapwing-125.convex.cloud/api/query -d '{"path":"contacts:listAllContacts"}'` (or use Convex dashboard's anonymous query) | HTTP 200 with `error: not authenticated` (was: full contact dump) |
| 2 | Sign in → `/admin/marketing/contacts` | Contacts render normally |
| 3 | Submit a Resend webhook with no signature | HTTP 400 |
| 4 | Schedule a campaign for 6 minutes from now | Cron fires once at minute 5; campaign flips to "sent". Reset clock; campaign does NOT re-fire on subsequent ticks. |
| 5 | Update Khari's name in Clerk | Convex `users.role` stays `"director"` (was: demoted to `"admin"`) |
| 6 | Edit notes on an event, blur to save, immediately type more | New typing persists. (was: clobbered after save settled) |
| 7 | Inquiry confirmation email | Branded LME header, teal CTA, plain-text fallback |
| 8 | Open `app.lmeband.com/dashboard` on phone (or narrow desktop window) | Hamburger button visible top-left; sidebar drawer opens on tap; kanban scrolls horizontally |

## Files added/changed

- 14 critical bug fixes touching ~40 files (commit `ba1a9ef`)
- 6 React Email templates + 6 sender migrations (commit `9e1372b`)
- 8 mobile responsive files (commit `0fa17d9`)

Plus a chunk of previously-untracked brand assets (Logo PNGs, photos, brand kit HTML) that landed in the email-template commit due to a `git add -A` sweep — harmless, but flag in the PR description so reviewers don't worry about scope.

## Known follow-ups (Phase 8+)

- Rate-limiting on public mutations (Bug #14 — needs Upstash or Vercel Edge)
- Setlist song-existence validation (Bug #11)
- Email preview server (`pnpm dlx react-email dev --dir convex/emailTemplates`) — wire as `pnpm email:dev` script
- Better error UX when `getByIdForPortal` fails (currently just renders "Booking not found.")
- Real Xero / Eventbrite OAuth (Phase 1b / Phase 3 stubs still pending)
