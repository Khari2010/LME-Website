# Phase 2 — Deploy Notes

Manual steps for shipping Phase 2 (Marketing v2). Builds on Phase 1a + 1b — those PRs must merge first.

## Deploy order

1. Merge Phase 1a → run Phase 1a deploy steps
2. Merge Phase 1b → run Phase 1b deploy steps
3. Merge Phase 2 → run Phase 2 deploy steps below

## What Phase 2 ships

| Capability | Status | Notes |
|---|---|---|
| Schedule campaigns for later (datetime picker on Composer) | ✅ live | 5-min cron fires due sends |
| Hard-bounce + complaint auto-suppression | ✅ live | Acts on Resend webhook events |
| Pre-send checklist modal | ✅ live | Validates merge tags, unsubscribe, recipients before send |
| Welcome series for /enhancers + /mailing-list signups | ✅ live (cron only) | Needs seed before working |
| Content Planner sub-page | ✅ live | Cross-source marketing timeline |

## 1. Convex prod push

```bash
pnpm dlx convex deploy --prod
```

Carries:
- New tables: `welcomeSeriesSteps`, `welcomeSeriesEnrollments`
- Schema additions: `campaigns.status` gains `"scheduled"`, `campaigns.scheduledAt`
- New modules: `campaigns` (extended), `campaignChecks`, `welcomeSeries`, `welcomeSeriesAction`, `scheduledSenderAction`, `contentPlanner`, `contacts` (extended)
- Crons: `scheduled campaign sender` (every 5 min), `welcome series tick` (hourly)

## 2. Seed the default welcome series

The welcome-series cron is registered but is a no-op until the 3 default steps exist. Run the seed once on prod:

```bash
pnpm dlx convex run welcomeSeries:seedDefaultSeries
```

Verify in Convex dashboard → Data → `welcomeSeriesSteps` shows 3 active rows for `seriesKey = "enhancers-default"`.

## 3. Optional env var

```bash
pnpm dlx convex env set WELCOME_FROM_ADDRESS enhancers@lmeband.com
```

(Falls back to `BOOKINGS_FROM_ADDRESS` then to `enhancers@lmeband.com` literal.)

## 4. Smoke test the marketing flows

| Flow | Steps | Expected |
|---|---|---|
| Schedule campaign | Compose → toggle "Schedule for later" → pick datetime 6 min in future → click Schedule send | Campaign appears in Campaigns list with "Scheduled" badge + "Sends ..." date label. After 6 min cron tick fires, status flips to "Sent" |
| Pre-send checklist | Compose → write campaign with bad merge tag like `{{badTag}}` and no unsubscribe → click Send | Modal shows ✗ on merge-tags + ✗ on unsubscribe; "Send anyway" button visible (disabled style) |
| Hard-bounce suppression | Trigger or simulate Resend `email.bounced` event with `bounce.type=Hard` for an existing contact's email → check Convex `contacts` row | `status` flipped to `"bounced"`, `notes` appended with auto-suppress marker |
| Welcome series | Sign up at `lmeband.com/enhancers/login` with a fresh email → wait up to 1 hour | Step 0 email arrives; `welcomeSeriesEnrollments` row exists with `nextStepIndex=1`, `nextStepDueAt` ~3 days out |
| Content Planner | `/admin/marketing/content-planner` | Renders monthly calendar with sent + scheduled campaigns; drafts listed below |

## 5. Editing welcome series steps

Currently no admin UI for editing the 3 steps — they're seeded once and editable via Convex dashboard:
- Convex dashboard → Functions → `welcomeSeries:upsertStep` with the new content
- OR Data → `welcomeSeriesSteps` → edit row directly

Phase 2 polish: wire an admin editor at `/admin/marketing/welcome-series`. Defer until first edit is actually needed.

## 6. Known follow-ups (Phase 3+ polish)

- Admin editor for welcome series steps
- Per-step analytics (open/click rate per drip step)
- A/B testing for subject lines
- Re-engagement series for inactive contacts (currently `enrollContact` is one-time-only)
- Step 0 instant-fire (currently waits up to 1 cron tick = 1 hour)
- Engagement marketing posts surface in Content Planner (data shape ready, no UI to author them yet — lands with Phase 3 Internal Shows)
