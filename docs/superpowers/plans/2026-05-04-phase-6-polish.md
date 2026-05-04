# Phase 6 — Polish Implementation Plan

> **Context:** Built autonomously after Phases 1a + 1b + 2 + 3 + 4 + 5. Branch: `feat/phase-6-polish` from `feat/phase-5-rbac-finance-analytics`.

**Goal:** Ship the buildable items from the spec's "Phase 6 — Future" bucket (those that don't need OAuth / API keys / production Clerk setup) plus the polish carry-overs from earlier phase reviews.

**Scope:**
- Public CMS for editable site copy
- `requireWrite` RBAC enforcement on key existing mutations
- Drag-and-drop reorder for Show Run + Setlists + Marketing Plan items
- `@convex/*` tsconfig path alias
- LLM transcript extraction wired (env-gated, falls back to heuristic)

**Out of scope:** Real Xero/Eventbrite OAuth, direct social posting, production Clerk keys — all need user-side setup.

## Tasks

### T1 — Public CMS for site copy

A central `siteCopy` table holding editable site copy. Admin page at `/admin/site-copy` lets directors edit. Public pages (homepage, setlist) read from it via Convex queries.

For Phase 6 ship: cover the homepage hero text, setlist page intro, and the booking form intro. Adding more later is just a matter of adding more keys.

**Files:**
- `convex/schema.ts` — `siteCopy` table (key + value, indexed by key)
- `convex/siteCopy.ts` — `getByKey` query, `setByKey` mutation (director-gated)
- `src/app/admin/(authed)/site-copy/page.tsx` — admin editor
- `src/app/(public-domain)/page.tsx` — homepage reads dynamic copy with fallback
- `src/app/(public-domain)/setlist/page.tsx` — setlist intro reads dynamic copy
- Sidebar update on /admin (already a flat list — no change needed)

### T2 — requireWrite RBAC enforcement on key mutations

Sprinkle `await requireWrite(ctx, "<module>")` at the top of write mutations that should be role-gated. Conservative scope:

- `convex/events.ts` — `create`, `update`, `setStatus`, `setShowRun`, `setProduction`, `setAfterParty`, `setTicketing`, `setSponsorship`, `setMarketingPlan`, `triggerTicketingSync`
- `convex/contracts.ts` — `sendContract` (write)
- `convex/discoveryCall.ts` — `proposeSlots`
- `convex/preEventSurvey.ts` — `sendSurvey`
- `convex/songs.ts` — `create`, `update`, `setArchived`
- `convex/setlists.ts` — `create`, `updateMeta`, `setItems`, `remove`
- `convex/demos.ts` — `create`, `update`, `setArchived`
- `convex/welcomeSeries.ts` — `upsertStep`

Add appropriate module gate per mutation (e.g. events.update gates "external-bookings" if event is ExternalBooking, "internal-shows" if InternalShow, etc.). For mutations that don't fit cleanly, gate on the broadest umbrella ("settings" effectively means director-only).

Client-facing mutations that don't fit RBAC (called by clients via magic-link tokens) STAY ungated:
- `convex/publicInquiry.submitInquiry` — public form
- `convex/bookingForm.submitFullForm` — client portal
- `convex/discoveryCall.pickSlot` — client portal
- `convex/contracts.signContract` — client portal
- `convex/preEventSurvey.submitSurvey` — client portal

### T3 — Drag-and-drop reorder

Replace the up/down arrow buttons with HTML5 drag-and-drop in:
- Show Run editor (Phase 3 T3)
- Setlist detail editor (Phase 4 T2-T3)
- Marketing Plan posts within a week (Phase 3 T6) — secondary

Pure HTML5 drag-and-drop API — no library. Keep the up/down buttons as keyboard-accessible alternatives.

### T4 — `@convex/*` tsconfig path alias

Add to `tsconfig.json`:

```json
"paths": {
  "@/*": ["./src/*"],
  "@convex/*": ["./convex/*"]
}
```

Replace the 5+ instances of deep relative imports like `../../../../../convex/_generated/api` with `@convex/_generated/api`.

### T5 — LLM transcript extraction (env-gated)

Implement the LLM path stubbed in Phase 4 T8. Gated by `ANTHROPIC_API_KEY` env var; falls back to heuristic when missing. Real Anthropic API call uses Claude Haiku for speed/cost.

**Files:**
- `convex/transcriptExtractionAction.ts` (new, Node) — calls Claude API; returns same shape as heuristic
- `convex/transcriptExtraction.ts` — when API key is present, schedule the action; else use existing heuristic

## Self-review approach

Same TDD-light pattern: implementer subagent → tsc + tests + build pass → commit. Final push + deploy notes.
