# Phase 2 — Marketing v2 Implementation Plan

> **Context:** Built autonomously after Phase 1a + 1b. Branch: `feat/phase-2-marketing-v2` from `feat/phase-1b-lifecycle`.

**Goal:** Make the existing Marketing module robust enough to retire MailChimp regrets — schedule for later, hard-bounce + complaint auto-suppression, pre-send checklist, welcome series for /enhancers signups, Content Planner cross-engagement view.

**Architecture:** Extends Phase 1a's existing Marketing surface (Compose / Campaigns / Contacts already shipped). Reuses the `campaigns` and `contacts` Convex tables. New tables: `welcomeSeries`, `welcomeSeriesEnrollments`. Adds two new sub-pages to the Marketing nav: Content Planner.

**Spec:** `docs/superpowers/specs/2026-05-03-lme-platform-vision-design.md` §7 (Marketing) and §11 Phase 2

## Tasks

### T1 — Schedule campaign for later

Compose page gains a "Schedule for later" toggle + datetime input. Campaign saved with `scheduledAt`. Daily cron scans for due campaigns and fires them.

**Files:**
- `convex/schema.ts` — add `scheduledAt: v.optional(v.number())` to campaigns table (already has `status: draft | sent`; add `"scheduled"` to the union)
- `convex/campaigns.ts` — add `scheduleSend` and `cancelSchedule` mutations
- `convex/scheduledSenderAction.ts` — Node action that runs every 5 minutes, finds `scheduled` campaigns past `scheduledAt`, fires the send pipeline
- `convex/crons.ts` — register the 5-minute cron
- `src/components/admin/Compose.tsx` (or wherever the existing compose UI lives) — add the schedule UI

### T2 — Hard-bounce + complaint auto-suppression

When Resend webhook fires `bounced` or `complained`, automatically flip the contact's `status` field to `bounced` or `unsubscribed`. Already partially wired (the webhook handler exists at `src/app/api/resend/webhook/route.ts`). Just needs to act on bounce/complaint events.

**Files:**
- `src/app/api/resend/webhook/route.ts` — extend
- `convex/contactsAdmin.ts` — add `markBouncedByEmail` and `markComplainedByEmail` internal mutations
- Tests for both mutations

### T3 — Pre-send checklist on compose

Before "Send campaign" actually fires, run validation: links resolve (HEAD request to each URL in body), all merge tags valid (`{{firstName}}`, `{{name}}`, `{{email}}` only), unsubscribe footer present in HTML, suppression list current. Display results in a modal.

**Files:**
- `convex/campaignChecks.ts` — query `runChecks(campaignId)` returns array of pass/fail items
- `src/components/admin/PreSendChecklist.tsx` — modal showing results
- Wire into existing Compose page's send flow

### T4 — Welcome series for /enhancers signups

Multi-step drip campaign that fires when a contact's `source` is `"enhancers-signup"`. Steps: Day 0 (welcome), Day 3 (intro to LME's vibe), Day 7 (latest mix link). Editable templates.

**Files:**
- `convex/schema.ts` — add `welcomeSeries` (template definitions) and `welcomeSeriesEnrollments` (per-contact step tracker) tables
- `convex/welcomeSeries.ts` — `enrollContact`, `processNextStep` (fires email if step due)
- `convex/welcomeSeriesAction.ts` — daily cron tick
- New admin sub-page or section to author/edit the series steps

### T5 — Content Planner sub-page

Cross-engagement marketing calendar showing all `marketingPlan.weeks[].posts` and standalone campaigns on a timeline. Drill-in from each entry → opens engagement detail's Marketing tab.

**Files:**
- `src/app/(app-domain)/marketing/content-planner/page.tsx` — new page
- `src/components/admin/ContentPlannerView.tsx` — the timeline/calendar
- Sidebar update — add Content Planner to Marketing children

## Out of scope

- Direct social posting (IG/TikTok) — Phase 5+ (deferred per spec)
- Social Dashboard (read-only stats) — Phase 5
- Per-engagement Marketing tab UI (data shape exists; tab UI ships when Internal Shows lands in Phase 3)

## Self-review approach

Each task: implementer subagent → tsc + tests + build pass → commit. Final commit pushes the branch and writes deploy notes.
