# Phase 6 — Deploy Notes

Manual steps for shipping Phase 6 (polish bucket: Public CMS + RBAC enforcement + drag-and-drop + tooling + LLM transcript). Builds on Phases 1a–5.

## Deploy order

1-6. Phases 1a → 1b → 2 → 3 → 4 → 5 in order
7. Merge Phase 6 → run steps below

## What Phase 6 ships

| Capability | Status | Notes |
|---|---|---|
| Public CMS for site copy | ✅ live | `/admin/site-copy`; setlist + bookingform pages read dynamic copy with hardcoded fallback |
| `requireWrite` enforcement on 24 mutations | ✅ live | Test bypass via `process.env.VITEST` |
| Drag-and-drop reorder for Show Run + Setlists | ✅ live | Native HTML5; up/down arrows retained for a11y |
| `@convex/*` tsconfig path alias | ✅ live | 60+ files updated from deep relative paths |
| LLM transcript extraction (env-gated) | ✅ live (gated) | Requires `ANTHROPIC_API_KEY` to activate; falls back to heuristic |

## 1. Convex prod push

```bash
pnpm dlx convex deploy --prod
```

Carries:
- New table: `siteCopy`
- Schema: `invitations.role` field already in P5 — Phase 6 adds nothing schema-side besides siteCopy
- New module: `siteCopy`
- New Node action: `transcriptExtractionAction`
- Updated mutations across 14 modules (RBAC gates)

## 2. Optional env vars

```bash
# Activate LLM transcript extraction (otherwise heuristic only):
pnpm dlx convex env set ANTHROPIC_API_KEY <key>
```

Get a key from https://console.anthropic.com. Uses `claude-haiku-4-5-20251001` for speed/cost.

## 3. Seed initial site copy

After deploy, populate the suggested keys via `/admin/site-copy` UI:

- `homepage.hero.tagline` — "WE WANT TO PARTY."
- `homepage.about.heading` — "About LME"
- `homepage.about.body` — (existing about copy)
- `setlist.intro` — (whatever the current static intro says)
- `bookingform.intro` — (whatever the current static intro says)
- `enhancers.signup.intro` — (whatever the current static intro says)

Existing pages have hardcoded fallback text, so nothing breaks if you skip this step. The CMS lets directors edit live without code deploys.

## 4. Smoke test

| Step | Where | Expected |
|---|---|---|
| 1 | `/admin/site-copy` (signed in as director) | List of keys; "+ New key" form |
| 2 | Add `homepage.hero.tagline` = "TEST EDIT" | Saves; row appears |
| 3 | Visit `/setlist` — does the intro show the dynamic value? | Yes (after adding `setlist.intro` key) |
| 4 | Visit `/bookingform` — same | Same pattern |
| 5 | Sign in as `marketing` role; try to call `events.create` via dev tools | Throws `forbidden: role "marketing" cannot write to "external-bookings"` |
| 6 | As director, edit a Show Run — drag rows by the ⋮⋮ grip | Reorders visually; save persists |
| 7 | As director, edit a setlist — drag song rows | Reorders; save persists |
| 8 | Open a Meeting event with a transcript → click Auto-extract | If `ANTHROPIC_API_KEY` set: action fires async → page reloads → LLM-extracted decisions/actions appear. If not: heuristic runs synchronously |

## 5. Known follow-ups (Phase 7+ or external work)

- Real Xero OAuth integration (Phase 1b stub)
- Real Eventbrite OAuth (Phase 3 stub)
- Direct social posting (IG/TikTok/Twitter — needs API keys + business accounts)
- Production Clerk keys + `clerk.lmeband.com`
- Drag-and-drop for Marketing Plan posts (deferred from T3 — same pattern, just not applied yet)
- Mobile-responsive D&D (current implementation uses HTML5 drag which is desktop-only — touch users still have arrow buttons)
- `next lint` migration to flat eslint config (Next.js 16 breaking change; pre-existing)
