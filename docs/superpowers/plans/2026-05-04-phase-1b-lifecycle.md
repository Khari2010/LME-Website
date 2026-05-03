# Phase 1b — Booking Lifecycle Implementation Plan

> **Context for review:** This plan is being executed autonomously overnight while Khari sleeps. Buildable tasks ship; tasks requiring API credentials, OAuth flows, or human decisions are stubbed with clear TODOs. Two PRs to review on wake: Phase 1a (the foundation) and Phase 1b (this plan's outputs).

**Goal:** Move the External Booking lifecycle from Inquiry to Completed inside the platform — full booking form sent to client, discovery call slot booking, contract auto-gen + e-sign, pre-event survey, audit log, client portal showing only confirmed items. Xero integration stubbed.

**Architecture:** Builds on Phase 1a's `events` schema. Adds a new `bookingTokens` table for magic-linked client portal access (mirrors the `/enhancers` HMAC pattern). Client portal lives at `app.lmeband.com/c/:slug/:token` with read-only-by-default access; write actions are sign / submit-form / pay-button (Xero deep-link stub). Xero invoice raise + webhook are stubbed but wired in shape.

**Spec:** `docs/superpowers/specs/2026-05-03-lme-platform-vision-design.md` §5 (Booking Lifecycle), §5.3 (Client Portal)
**Phase 1a plan:** `docs/superpowers/plans/2026-05-03-phase-1a-bookings-mvp.md`

## Tasks

### Task B1 — Client portal token infrastructure

Add `bookingTokens` table + helpers to mint/verify magic-link tokens scoped to a single event. Token lifetime: 6 months from mint, refreshable.

**Files:**
- `convex/schema.ts` — append `bookingTokens` table
- `convex/bookingTokens.ts` — `mintForEvent`, `verifyToken`, `revokeToken`
- `tests/convex/bookingTokens.test.ts`

**Schema:**
```ts
bookingTokens: defineTable({
  eventId: v.id("events"),
  token: v.string(),       // random URL-safe ~32 chars
  mintedAt: v.number(),
  expiresAt: v.number(),   // mintedAt + 6 months
  revokedAt: v.optional(v.number()),
})
  .index("by_token", ["token"])
  .index("by_event", ["eventId"]),
```

### Task B2 — Magic-link client portal (read-only)

`/c/:slug/:token` page rendering the engagement's confirmed-only items: greeting, booking summary, contract status, invoice status, agreed setlist, outstanding-from-us list, notes shared with client.

**Files:**
- `src/app/(public-domain)/c/[slug]/[token]/page.tsx` (lives on public host so clients don't hit Clerk)
- `src/app/(public-domain)/c/[slug]/[token]/layout.tsx` — minimal LME-branded shell (no /admin, no sidebar)
- `src/components/client-portal/PortalShell.tsx` — header/footer
- `src/components/client-portal/PortalSection.tsx` — section wrapper

**Visibility rules:** an engagement field appears on the portal ONLY if a corresponding `<field>SharedAt` timestamp is set in the engagement (e.g. `contract.sentAt`, `finance.deposit.sentAt`, etc.). Drafts never appear.

### Task B3 — Internal "send full booking form" action

Admin-side button on event detail page that mints a token, builds the full booking form URL, and emails it to the client.

**Files:**
- `convex/bookingForm.ts` — `sendFullForm` mutation (mints token + schedules email)
- `convex/bookingFormEmail.ts` — Node action sending the email via Resend
- `src/app/(app-domain)/events/[id]/page.tsx` — add the button

### Task B4 — Full booking form on the portal

Client fills out band config, extras, equipment, staging on `/c/:slug/:token/booking-form`. Submission writes to `event.bookingConfig`, advances status to `FormReturned`.

**Files:**
- `src/app/(public-domain)/c/[slug]/[token]/booking-form/page.tsx`
- `convex/bookingForm.ts` — `submitFullForm` mutation

### Task B5 — Discovery call slot booking

Internal admin proposes 3-5 slots on the event; client picks one on the portal. Updates event with `discoveryCallAt` timestamp.

**Files:**
- `convex/discoveryCall.ts` — `proposeSlots`, `pickSlot`, `cancel`
- `src/app/(public-domain)/c/[slug]/[token]/discovery-call/page.tsx`
- Engagement schema gains `discoveryCall: v.optional(v.object({ proposedSlots, pickedAt, slot }))`

### Task B6 — Contract template + auto-generation

Single HTML contract template populated from event data. Stored on event as `contract.fileUrl` (data URL or Convex Storage).

**Files:**
- `convex/contracts.ts` — `generateContract` action that renders template
- `src/lib/contracts/templates/standard.ts` — the template
- Optional: Convex Storage integration for PDF rendering. v1: HTML only.

### Task B7 — E-sign flow on portal

Client types name, clicks Agree, submits. Updates `contract.signedAt`, `contract.signedByName`, appends to `contract.auditLog`.

**Files:**
- `convex/contracts.ts` — `signContract` mutation (with audit-log entry)
- `src/app/(public-domain)/c/[slug]/[token]/contract/page.tsx`

### Task B8 — Pre-event survey form

After booking is confirmed (deposit paid), client receives a portal link to a pre-event form: genres preference, must-plays, do-not-plays, final timing confirmation, day-of contact details.

**Files:**
- `convex/preEventSurvey.ts` — `submit` mutation
- `src/app/(public-domain)/c/[slug]/[token]/pre-event/page.tsx`

### Task B9 — Audit log surface on event detail

Event detail's Finance & Legal tab gains an "Audit log" section showing every client action (viewed, signed, paid, submitted form).

**Files:**
- `src/app/(app-domain)/events/[id]/finance/page.tsx` — extend
- `src/components/crm/AuditLog.tsx`

### Task B10 — Xero integration (STUBBED)

Stub the integration shape: a `convex/xero.ts` module exposing `pushInvoice` and `handleWebhook` that log + return mock data. Document required env vars (`XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_TENANT_ID`) in deploy notes. Real OAuth flow + token refresh requires manual setup Khari does in dashboard.

**Files:**
- `convex/xero.ts` — stubs with TODO markers
- `docs/superpowers/plans/deploy-notes-phase-1b.md` — manual Xero OAuth setup

### Task B11 — Auto reminder cron

Scheduled function: every day at 9am, find events with `finance.balance.dueDate` 14d/7d/1d away (and not paid) and send reminder emails. Phase-1b-stub: don't actually fire emails until SMTP/Resend templates designed; just log the candidates.

**Files:**
- `convex/crons.ts` — define daily cron
- `convex/reminders.ts` — `findDueReminders` + `sendReminderEmail` (Node action)

## Out of scope for autonomous overnight work

- Actual Xero OAuth flow (requires user dashboard setup)
- Production Clerk keys
- Domain registration
- Contract PDF rendering (HTML only for v1; PDF needs `puppeteer` or external service)
- Real production smoke testing
- DocuSign/HelloSign integration (we're building in-platform per spec)

## Self-review approach

Each task: implementer subagent → tsc + tests + build pass → commit. Reviewer subagents skipped to maximise build progress overnight. Final commit pushes the branch and writes deploy notes. Khari reviews the diff in the PR.

## Branch + PR strategy

- Branch: `feat/phase-1b-lifecycle`, branched from `feat/phase-1a-bookings-mvp`
- When Phase 1a merges, Phase 1b can be rebased onto main
- Push at end with deploy notes update
