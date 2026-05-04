# Phase 4 — Music + Team Diary Implementation Plan

> **Context:** Built autonomously after Phases 1a + 1b + 2 + 3. Branch: `feat/phase-4-music-team-diary` from `feat/phase-3-internal-shows`.

**Goal:** Add the Music module (Setlists / Songs / Demos) and Team Diary sub-page (Meetings / Rehearsals / Socials with transcript + decisions + actions extraction). Wire the forward-referenced `setlistRef` on Show Run rows.

**Spec:** `docs/superpowers/specs/2026-05-03-lme-platform-vision-design.md` §11 Phase 4.

## Tasks

### T1 — Songs catalog table + page

A central table of songs LME performs. Each song has: title, original artist, key (e.g. "C major"), bpm (number), lead vocalist (string from team roster — or just a free-text field), genre tags, demo links (array of URLs — SoundCloud, YouTube, etc.), notes.

**Files:**
- `convex/schema.ts` — new `songs` table
- `convex/songs.ts` — CRUD mutations + queries
- `src/app/(app-domain)/music/page.tsx` — redirect to `/music/songs`
- `src/app/(app-domain)/music/songs/page.tsx` — list/grid + add form
- Sidebar update: enable Music

### T2 — Setlists table + list page

Setlists are ordered collections of songs. Setlist has a name (e.g. "Summer 2026 Default"), purpose (string — "Wedding", "Festival", "Pop-up"), and an array of items with order + songId + optional notes.

**Files:**
- `convex/schema.ts` — new `setlists` table
- `convex/setlists.ts` — CRUD mutations + queries
- `src/app/(app-domain)/music/setlists/page.tsx` — list + add

### T3 — Setlist detail editor

Reorderable song list within a setlist. Drag to reorder (or arrow buttons), pick songs from the catalog, optional inline notes per row.

**Files:**
- `src/app/(app-domain)/music/setlists/[id]/page.tsx`
- Components for song picker + draggable row

### T4 — Wire setlistRef on Show Run rows

Now that the `setlists` table exists, add `setlistRef: v.optional(v.id("setlists"))` to the `showRun` validator. Show Run editor gets a "Use setlist" picker per row.

**Files:**
- `convex/schema.ts` — add setlistRef to showRun item
- `convex/events.ts` — mirror in eventDocValidator + setShowRun mutation
- `src/app/(app-domain)/events/[id]/show-run/page.tsx` — add setlist picker

### T5 — Demos library

Standalone demos: a list of audio/video URLs with title + tags + linked-song (optional). Could be a tab on the Songs page, OR a separate sub-page. **Design:** standalone sub-page at `/music/demos` for clarity.

**Files:**
- `convex/schema.ts` — new `demos` table (or extend Phase 1a's `assets` table)
- `convex/demos.ts` — CRUD
- `src/app/(app-domain)/music/demos/page.tsx`

### T6 — Team Diary sub-page

Sub-page at `/events/team-diary` showing all events with `family=TeamDiary` (Meeting / Rehearsal / Social / ContentShoot). Mirror the Internal Shows kanban pattern but with TeamDiary statuses (Scheduled / InProgress / Completed). Or use a list/calendar view since these are short-cycle.

**Files:**
- `src/app/(app-domain)/events/team-diary/page.tsx`
- Sidebar update: enable Team Diary

### T7 — Meeting / Rehearsal / Social tabs on event detail

Three tab pages (or one shared) for the Team Diary types. The schema's `meetingDetails` sub-block is currently `v.any()` — tighten:

```ts
meetingDetails: v.optional(v.object({
  attendees: v.array(v.string()),  // free-text names; can map to users in T8
  transcript: v.optional(v.string()),
  decisions: v.array(v.string()),
  actions: v.array(v.object({
    description: v.string(),
    assignee: v.optional(v.string()),  // free-text name; ID later
    done: v.boolean(),
  })),
})),
```

Tab `/events/[id]/meeting-details` lets admin:
- Edit attendees
- Paste transcript
- Add/remove decisions
- Add/remove actions (description / assignee / done)

### T8 — Auto-extract decisions + actions from transcript (STUB)

A button on the meeting-details tab that takes the pasted transcript and uses a simple heuristic + Anthropic API call to extract decisions and actions. STUB the API call (env-gated like Xero/Eventbrite).

Heuristic fallback (no API): split transcript into lines, find lines starting with action verbs ("send", "schedule", "follow up", "decide", "agree") and bucket them.

**Files:**
- `convex/transcriptExtraction.ts` — Node action `extractFromTranscript`
- Wire button into the meeting-details tab

## Out of scope

- Drag-and-drop reorder for setlists (use arrow buttons)
- Audio waveform players for demos (just links)
- Real LLM API call for action extraction (stubbed; heuristic fallback always works)

## Self-review approach

Same TDD-light pattern: implementer subagent → tsc + tests + build pass → commit. Final push + deploy notes.
