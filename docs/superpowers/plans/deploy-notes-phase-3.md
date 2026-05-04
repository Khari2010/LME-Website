# Phase 3 — Deploy Notes

Manual steps for shipping Phase 3 (Internal Shows). Builds on Phases 1a + 1b + 2.

## Deploy order

1. Merge Phase 1a → run 1a deploy steps
2. Merge Phase 1b → run 1b deploy steps
3. Merge Phase 2 → run 2 deploy steps (welcome series seed!)
4. Merge Phase 3 → run 3 deploy steps below

## What Phase 3 ships

| Capability | Status | Notes |
|---|---|---|
| Internal Shows sub-page kanban (6 stages) | ✅ live | Mirrors External Bookings pipeline |
| Family-aware create form (External / Internal / Team Diary) | ✅ live | Type select + initial status switch by family |
| Show Run tab (MainShow / PopUp / Festival) | ✅ live | Add/remove/reorder rows; live total duration |
| Production tab (MainShow / Festival) | ✅ live | Crew, suppliers, load-in/out, rider, decor team |
| After Party tab (MainShow only) | ✅ live | Venue, host, DJ lineup, sections |
| Marketing plan tab (MainShow / PopUp / Festival) | ✅ live | Phased weekly authoring; Content Planner reads this |
| Ticketing tab + voucher editor (MainShow / PopUp) | ✅ live (Eventbrite stubbed) | Tier list + sync stub + voucher codes |
| Sponsorship pipeline (MainShow only) | ✅ live | 5-stage activations + cutoff date |
| Type-aware tab nav | ✅ live | Tabs filtered per event.type |

## 1. Convex prod push

```bash
pnpm dlx convex deploy --prod
```

Carries:
- Schema tightening: `showRun`, `production`, `afterParty`, `marketingPlan`, `ticketing`, `sponsorship` all moved from `v.any()` to structured validators
- New modules: `eventbrite`, `eventbriteMutations`
- New mutations: `setShowRun`, `setProduction`, `setAfterParty`, `setMarketingPlan`, `setTicketing`, `setSponsorship`, `triggerTicketingSync`
- No new tables (everything lives on existing `events` rows)
- No new crons

**Backwards compatibility:** existing events migrated from Notion in Phase 1a have `showRun=undefined`, `production=undefined`, etc. — all fields are optional, so nothing breaks. The structured validators only fire on writes.

## 2. Eventbrite OAuth setup (when ready)

Phase 3 ships a stub. To activate the real integration:

1. Register an app at https://www.eventbrite.com/account-settings/apps
2. Generate a private OAuth token (this is simpler than Xero — no full OAuth flow needed for read-only sales data)
3. Set in Convex prod:
   ```bash
   pnpm dlx convex env set EVENTBRITE_TOKEN <your-private-token>
   ```
4. Replace the `TODO: real Eventbrite API call` block in `convex/eventbrite.ts:syncSales` with the actual fetch:
   ```ts
   const response = await fetch(
     `https://www.eventbriteapi.com/v3/events/${args.externalEventId}/ticket_classes/`,
     { headers: { Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}` } },
   );
   const { ticket_classes } = await response.json();
   for (const tc of ticket_classes) {
     await ctx.scheduler.runAfter(0, internal.eventbriteMutations.updateTierSold, {
       eventId: args.eventId,
       tierName: tc.name,
       sold: tc.quantity_sold,
     });
   }
   ```
5. (Optional) Register a periodic sync cron in `convex/crons.ts`:
   ```ts
   crons.interval("eventbrite sync", { minutes: 30 }, internal.eventbrite.scheduledSyncAll);
   ```
   You'll need to add a `scheduledSyncAll` action that finds Internal Shows with `ticketing.externalEventId` set and fires `syncSales` for each.

## 3. Smoke test

| Step | Where | Expected |
|---|---|---|
| 1 | `app.lmeband.com/events/internal-shows` | Empty state visible (no internal shows yet) |
| 2 | Click "+ New" | Lands on `/events/new?family=InternalShow`. Type select shows MainShow / PopUp |
| 3 | Create a Main Show with name "Summer Show 2026" + date | Lands on event detail. Tab nav shows: Overview · Setlist · Show Run · Production · After Party · Ticketing · Sponsorship · Marketing |
| 4 | Show Run tab → Add 3 rows (Intro/Set 1/Outro) → Save | Tab refreshes with the rows; total duration computed |
| 5 | Production tab → Add a crew member + load-in time → Save | Persists |
| 6 | After Party tab → Add a DJ + section → Save | Persists |
| 7 | Marketing tab → Add 18-week plan with phased posts → Save | Persists |
| 8 | Ticketing tab → Set platform=Eventbrite + add 3 tiers + 1 voucher → Save | Persists |
| 9 | Click "Sync now" | Stub fires; lastSyncedAt updates in ~1 sec |
| 10 | Sponsorship tab → Add 2 activations → Save | Persists; pipeline rollup shows confirmed/paid totals |
| 11 | `app.lmeband.com/events/internal-shows` | Summer Show 2026 appears in the Planning column |
| 12 | `lmeband.com/admin/marketing/content-planner` | Marketing posts from Summer Show appear on the calendar |

## 4. Known follow-ups (Phase 4+)

- Setlists table (Phase 4 Music module) — `showRun` will gain a `setlistRef` field
- Eventbrite real API integration (currently stubbed)
- Skiddle integration (currently just a select option; no API)
- Drag-and-drop reorder for Show Run / Marketing posts (currently arrow buttons)
- Bulk import of voucher codes from CSV
- Sponsorship deal pipeline analytics (conversion rate by stage, time-in-stage)
- Per-show analytics dashboard (sales velocity vs target, remaining capacity)
