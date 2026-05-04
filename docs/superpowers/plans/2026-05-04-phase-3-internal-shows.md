# Phase 3 — Internal Shows Implementation Plan

> **Context:** Built autonomously after Phases 1a + 1b + 2. Branch: `feat/phase-3-internal-shows` from `feat/phase-2-marketing-v2`.

**Goal:** Activate Main Show + Pop-Up engagement types in the UI. Adds Show Run / Production / After Party / Marketing tabs, ticketing platform sync (Eventbrite/Skiddle — stubbed where API needs OAuth), sponsorship pipeline, voucher code tracking, marketing aggregator (already present in Content Planner).

**Spec:** `docs/superpowers/specs/2026-05-03-lme-platform-vision-design.md` §11 Phase 3, §4.4 (tab matrix), §4.2 (schema sketches for ticketing/sponsorship/afterParty/showRun/production/marketingPlan).

## Tasks

### T1 — Internal Shows sub-page (kanban / list)

Sub-page at `/events/internal-shows` showing all `family=InternalShow` engagements grouped by status (Planning / InProduction / Confirmed / ReadyForShow / Live / Completed). Mirror the External Bookings pipeline pattern but with this family's status union.

**Files:**
- `src/app/(app-domain)/events/internal-shows/page.tsx`
- Sidebar update: change `disabled: true` to enabled for Internal Shows
- Maybe a new `InternalShowPipeline` component (or reuse Pipeline with stages prop)

### T2 — Internal Show types active in event create form

Update the manual create form (`src/app/(app-domain)/events/new/page.tsx`) to support `family=InternalShow` types: `MainShow`, `PopUp`. When `family=InternalShow` is in the URL query, the type select changes options.

### T3 — Show Run tab on event detail (for MainShow / PopUp)

New tab `/events/[id]/show-run`. Lists structured run-of-show items: order, name, durationMins, optional notes, optional cues. Editable inline. Schema already has `showRun` as an optional array on the events table — currently typed as `v.any()` in the validator. Tighten the validator + add the tab.

**Files:**
- `convex/events.ts` — tighten `showRun` validator from `v.any()` to a structured array
- `convex/showRun.ts` — addItem / updateItem / removeItem / reorder mutations
- `src/app/(app-domain)/events/[id]/show-run/page.tsx`
- `src/components/crm/EventDetailHeader.tsx` — show the Show Run tab when type is MainShow or PopUp

### T4 — Production tab on event detail

`/events/[id]/production`. Crew, suppliers, load-in/load-out timestamps, decor team note, rider URL.

**Files:**
- `convex/events.ts` — tighten `production` validator
- `src/app/(app-domain)/events/[id]/production/page.tsx`
- Tab nav update

### T5 — After Party tab (MainShow only)

`/events/[id]/after-party`. Venue, DJ lineup, host, sections (genre + duration). Mirror Show Run shape.

**Files:**
- `convex/events.ts` — tighten `afterParty` validator
- `src/app/(app-domain)/events/[id]/after-party/page.tsx`

### T6 — Marketing tab on event detail (per-show plan)

`/events/[id]/marketing`. Phased weekly marketing plan with posts per platform (IG / TikTok / email). Each post has copy + scheduledAt. Already partially supported by Content Planner (Phase 2 T5 reads from `event.marketingPlan.weeks[].posts[]`); this task adds the AUTHORING UI.

**Files:**
- `convex/events.ts` — tighten `marketingPlan` validator
- `src/app/(app-domain)/events/[id]/marketing/page.tsx`

### T7 — Ticketing tab + Eventbrite/Skiddle stub

`/events/[id]/ticketing`. Shows ticket tiers + sales count. Read-side integration via Eventbrite Public Events API for an event ID stored on `event.ticketing.externalEventId`. Skiddle is read-only here too. STUB the actual API call with env-gated activation pattern (same as Xero in Phase 1b).

**Files:**
- `convex/eventbrite.ts` — Node action `syncSales` (stubbed)
- `convex/eventbriteMutations.ts` — V8 internal mutation to update `ticketing.tiers[].sold`
- `convex/eventbriteSync.ts` — periodic sync cron (every 30 min, gated by `EVENTBRITE_TOKEN` env)
- `src/app/(app-domain)/events/[id]/ticketing/page.tsx`

### T8 — Voucher code tracking

UI section within Ticketing tab to add/manage voucher codes: code, discount %, max uses, used count. Schema already has `ticketing.voucherCodes[]`. Add the editor.

### T9 — Sponsorship pipeline (MainShow only)

`/events/[id]/sponsorship`. List of activations: brand name, contact, stage (pitched / interested / confirmed / paid), base package, variable costs, cutoffDate.

**Files:**
- `convex/events.ts` — tighten `sponsorship` validator
- `src/app/(app-domain)/events/[id]/sponsorship/page.tsx`

### T10 — Sub-event linking via parentEventId

Event detail page gains a "Sub-events" section listing children (rehearsals, content shoots tied to this Main Show). Schema already has `parentEventId`. UI shows a list with "+ Add sub-event" → spawns a new event with `parentEventId` set.

## Out of scope

- Real Eventbrite/Skiddle API integration (needs OAuth + production token — stubbed)
- Calendar export of internal show events to Google/iCloud (Phase 4)
- Automated marketing post publishing to social media (Phase 5+)

## Constraints

- This is a 10-task plan — only tasks T1, T3, T4, T6 are "must-have" for the Internal Shows MVP. T5, T7, T8, T9, T10 are nice-to-have. T2 is foundational (1 line change really).

## Self-review approach

Same TDD-light pattern as Phase 2: implementer subagent → tsc + tests + build pass → commit. Final push + deploy notes.
