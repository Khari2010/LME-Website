# Phase 4 — Deploy Notes

Manual steps for shipping Phase 4 (Music + Team Diary). Builds on Phases 1a + 1b + 2 + 3.

## Deploy order

1-4. Phases 1a → 1b → 2 → 3 in order
5. Merge Phase 4 → run steps below

## What Phase 4 ships

| Capability | Status | Notes |
|---|---|---|
| Songs catalogue | ✅ live | Title, artist, key, BPM, lead, genres, demo links, soft-archive |
| Setlists table + list + detail editor | ✅ live | Reorderable song picker; ordered items |
| `setlistRef` on Show Run rows | ✅ live | Show Run rows can reference a setlist |
| Demos library | ✅ live | URL collection with tags + linked-song |
| Team Diary sub-page | ✅ live | Upcoming / Past list view of TeamDiary events |
| Meeting Details tab | ✅ live (Meeting/Rehearsal/Social/ContentShoot) | Attendees / transcript / decisions / actions |
| Auto-extract decisions + actions from transcript | ✅ live (heuristic) | LLM path stubbed; gated by `ANTHROPIC_API_KEY` for future |

## 1. Convex prod push

```bash
pnpm dlx convex deploy --prod
```

Carries:
- New tables: `songs`, `setlists`, `demos`
- Schema tightening: `meetingDetails` now structured (was `v.any()`)
- `showRun` items gain `setlistRef: v.optional(v.id("setlists"))`
- New modules: `songs`, `setlists`, `demos`, `meetingDetails`, `transcriptExtraction`

**Backwards compatibility:** `meetingDetails` was previously `v.any()` and (per prior session memory) had no production rows. The structured shape is now strict — if any existing TeamDiary events have a freeform `meetingDetails`, they'd fail validation on next read. Spot-check Convex prod after deploy: query `events` where `family === "TeamDiary"` and verify any populated `meetingDetails` matches the new shape, OR clear the field and let users re-populate.

## 2. Optional: Anthropic API key for LLM extraction

The transcript-extraction button works today on the heuristic path. If you want LLM-quality extraction:

1. Get a Claude API key from https://console.anthropic.com
2. Set in Convex prod:
   ```bash
   pnpm dlx convex env set ANTHROPIC_API_KEY <key>
   ```
3. Wire the LLM path: create `convex/transcriptExtractionAction.ts` (Node) that calls Claude Haiku with a structured-output prompt asking for decisions + actions. Keep the heuristic as a fallback when the API key is missing or the call fails.

Skipped for the Phase 4 ship — heuristic is functional and free.

## 3. Smoke test

| Step | Where | Expected |
|---|---|---|
| 1 | `app.lmeband.com/music/songs` | Empty state. Click "+ Add song" → fill in "Crazy in Love" / Beyoncé / F minor / 99 BPM / RnB → Save | Row appears in table |
| 2 | `/music/setlists` | Click "+ New setlist" → name "Wedding default" → Create | Lands on detail page |
| 3 | Detail → "+ Add item" → pick the song → Save setlist | Item shows |
| 4 | Create a Main Show event → Show Run tab → add a row → setlist picker shows the new setlist → save | Setlist ref persists |
| 5 | `/music/demos` | "+ Add demo" → SoundCloud URL + tags → Save | Row appears |
| 6 | `/events/team-diary` | Empty state. Click "+ New" → form defaults to TeamDiary family + Meeting type | Create works |
| 7 | Meeting event detail → Meeting Details tab | Editor for attendees / transcript / decisions / actions |
| 8 | Paste a transcript with "Send invoice today." and "Decision: Move event to Sunday." → Save → click Auto-extract | Page reloads. 1 action + 1 decision added |

## 4. Known follow-ups (Phase 5+)

- LLM transcript extraction (currently heuristic-only)
- Drag-and-drop reorder for setlists (currently arrow buttons)
- Audio waveform players for demos (currently just clickable links)
- Convert raw transcript timestamps into `[hh:mm:ss]` searchable format
- Setlist genre balance analysis (e.g. "this setlist is 60% RnB — diversify?")
- Meeting attendees as `Id<"users">` references rather than free-text strings (when Phase 5 RBAC fully lands)
