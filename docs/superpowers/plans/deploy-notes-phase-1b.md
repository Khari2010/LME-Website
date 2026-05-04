# Phase 1b — Deploy Notes

Manual steps required to ship Phase 1b (Booking Lifecycle) to production. Phase 1b builds on Phase 1a — both PRs must merge in order, and Phase 1a's deploy steps must be done first (`docs/superpowers/plans/deploy-notes-phase-1a.md`).

## Deploy order

1. Merge Phase 1a PR → run Phase 1a deploy steps
2. Merge Phase 1b PR → run Phase 1b deploy steps below

## What ships in Phase 1b

| Capability | Status | Notes |
|---|---|---|
| Magic-linked client portal at `lmeband.com/c/<slug>/<token>` | ✅ live | 6-month token lifespan |
| Full booking form (band config / extras / equipment / staging) | ✅ live | Admin sends; client fills |
| Discovery call slot booking | ✅ live | Admin proposes 3 slots; client picks one |
| Contract auto-generation + e-sign | ✅ live | HTML template; in-platform signature with audit log |
| Pre-event survey (genres / must-plays / day-of contact) | ✅ live | Admin sends after deposit paid |
| Audit log on Finance & Legal tab | ✅ live | Shows every client action |
| Xero invoice raise + webhook | ⚠️ STUB | Needs OAuth setup (see §3) |
| Daily reminder cron | ⚠️ STUB | Logs candidates by default; gated by `REMINDERS_ENABLED=true` |

## 1. Convex — push the new schema + functions

The Phase 1b branch adds:
- `bookingTokens` table
- `events.preEventSurvey` and `events.discoveryCall` sub-blocks
- New modules: `bookingTokens`, `bookingForm`, `bookingFormEmail`, `contracts`, `contractsEmail`, `discoveryCall`, `discoveryCallEmail`, `preEventSurvey`, `preEventSurveyEmail`, `xero`, `reminders`, `remindersAction`, `crons`

```bash
# From a local checkout on feat/phase-1b-lifecycle (or after merge to main)
pnpm dlx convex deploy --prod
```

The `crons.ts` registration will activate the daily reminder scan immediately (logs only by default — see §4 to enable email sending).

## 2. Vercel env vars

Already-required (from Phase 1a):
- `RESEND_API_KEY`
- `BOOKINGS_FROM_ADDRESS=enquiries@lmeband.com`
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CONVEX_URL`

New for Phase 1b (all optional — features short-circuit gracefully when missing):
- `REMINDERS_ENABLED=true` — enable the daily balance-due reminder emails (default: logs only)
- Xero block (see §3 — all four required to activate Xero):
  - `XERO_CLIENT_ID`
  - `XERO_CLIENT_SECRET`
  - `XERO_TENANT_ID`
  - `XERO_REFRESH_TOKEN`

Set Convex env vars (these need to be on the Convex deployment, not Vercel):
```bash
pnpm dlx convex env set RESEND_API_KEY <key>
pnpm dlx convex env set BOOKINGS_FROM_ADDRESS enquiries@lmeband.com
pnpm dlx convex env set REMINDERS_ENABLED true   # only when ready
```

## 3. Xero OAuth setup (when ready to activate)

Phase 1b ships a Xero stub — every action short-circuits with a `console.warn` and returns mock data when env vars are missing. To activate the real integration:

### One-time setup

1. **Create Xero developer account** at https://developer.xero.com
2. **Create a new app** → "Web app" type. Note the Client ID + Client Secret.
3. **Set redirect URI** to `https://app.lmeband.com/api/xero/callback` (this route doesn't exist yet — needs to be added when activating; route handler pattern in `src/app/api/clerk/webhook/route.ts` is the template)
4. **Authorise the app** for the Xero org (LME's tenant). Note the Tenant ID after auth completes.
5. **Capture the OAuth tokens** — initial authorization gives `access_token` (30 min lifespan) + `refresh_token` (90 days, rotates on refresh).

### Set env vars in Convex

```bash
pnpm dlx convex env set XERO_CLIENT_ID <id>
pnpm dlx convex env set XERO_CLIENT_SECRET <secret>
pnpm dlx convex env set XERO_TENANT_ID <tenant>
pnpm dlx convex env set XERO_REFRESH_TOKEN <refresh-token>
```

### Activate token refresh cron

In `convex/crons.ts`, uncomment the Xero refresh job:

```ts
crons.interval("xero token refresh", { minutes: 25 }, internal.xero.refreshAccessToken);
```

Then implement the actual refresh in `convex/xero.ts:refreshAccessToken`. The current stub returns null when configured — it needs to:
- POST to `https://identity.xero.com/connect/token` with `grant_type=refresh_token&refresh_token=...`
- Receive new `access_token` + new `refresh_token`
- Store the new refresh token (Convex env vars can't be set from inside a function — need either a `secrets` table OR a Vercel Cron API route that updates the env)

The cleanest pattern: store the rotating refresh token in a single-row Convex `secrets` table. Initial setup writes it from env; subsequent refreshes update the table.

### Implement the real `pushInvoice` body

Replace the TODO in `convex/xero.ts:pushInvoice` with the Xero API call:

```ts
const accessToken = await getAccessToken(); // reads from secrets table
const response = await fetch("https://api.xero.com/api.xro/2.0/Invoices", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Xero-Tenant-Id": process.env.XERO_TENANT_ID!,
  },
  body: JSON.stringify({
    Type: "ACCREC",
    Contact: { Name: args.contactName, EmailAddress: args.contactEmail },
    Date: new Date().toISOString().slice(0, 10),
    DueDate: new Date(args.dueDateMs).toISOString().slice(0, 10),
    LineItems: [{
      Description: `LME ${args.kind === "deposit" ? "deposit" : "balance"} for ${args.reference ?? "booking"}`,
      Quantity: 1,
      UnitAmount: args.amount,
      AccountCode: "200", // Sales — adjust per LME's chart of accounts
    }],
    Status: "AUTHORISED",
  }),
});
```

### Implement the webhook route

Add `src/app/api/xero/webhook/route.ts` that verifies the Xero signature, parses the events, and calls `internal.xero.handleWebhook`. Pattern: same as `src/app/api/resend/webhook/route.ts`.

### Wire `pushInvoice` into the booking lifecycle

After contract signed → automatically push the deposit invoice:
- In `convex/contracts.ts:signContract`, after `await ctx.db.patch(...)`, schedule the Xero push:
  ```ts
  await ctx.scheduler.runAfter(0, internal.xero.pushInvoice, {
    eventId: tokenRow.eventId,
    kind: "deposit",
    contactName: event.client?.name ?? "",
    contactEmail: event.client?.email ?? "",
    amount: event.finance?.deposit?.amount ?? event.finance!.fee * 0.5,
    dueDateMs: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    reference: event.name,
  });
  ```
- This is currently NOT wired so contracts can be signed without triggering Xero — intentional for Phase 1b ship without OAuth.

## 4. Reminder cron (when ready to activate)

The cron is registered immediately at deploy time (runs daily at 9am UTC). By default it only logs candidates. To enable real email sends:

```bash
pnpm dlx convex env set REMINDERS_ENABLED true
```

Verify by checking Convex logs the next morning at 9am UTC for `[reminders]` lines.

## 5. Smoke test the lifecycle end-to-end

Once Phase 1b is deployed:

| Step | Where | Expected |
|---|---|---|
| 1 | `lmeband.com/bookingform` | Submit a test inquiry; lands as `Inquiry` in pipeline |
| 2 | `app.lmeband.com/events/<id>` | Click "Send full booking form"; client receives email |
| 3 | Email link | Opens `lmeband.com/c/<slug>/<token>/booking-form`; fill + submit; status → `FormReturned` |
| 4 | `app.lmeband.com/events/<id>` | Click "Propose call slots"; enter 3 datetimes; client receives email |
| 5 | Email link | Opens `/discovery-call`; pick a slot; status updated |
| 6 | `app.lmeband.com/events/<id>/finance` | Set fee on the event (manual edit via update mutation OR future UI) |
| 7 | `app.lmeband.com/events/<id>` | Click "Send contract"; client receives email |
| 8 | Email link | Opens `/contract`; review HTML; type name + check agree + sign; status → `ContractSigned` |
| 9 | `app.lmeband.com/events/<id>/finance` | Audit log shows `contract_sent` + `contract_signed` |
| 10 | (Manual until Xero wired) | Manually flip `finance.deposit.paid = true` to advance status to `Booked` |
| 11 | `app.lmeband.com/events/<id>` | Click "Send pre-event survey"; client receives email |
| 12 | Email link | Opens `/pre-event`; pick genres + must-plays + contact; submit; admin sees data |

## 6. Setting fees on events (interim UX gap)

The contract-send action requires `event.finance.fee` to be set. There's no UI for this in Phase 1b — the Finance & Legal tab is read-only. Two interim options:

- **Option A:** add a small inline form to set fee/deposit on the Finance & Legal tab (Phase 1b polish task — not done yet)
- **Option B:** set fee via Convex dashboard → Data → events → edit row directly

Option B is the current path. **TODO**: add the inline form when the contract flow goes live for the first real client.

## 7. Token-revocation flow (admin side)

The `bookingTokens.revokeForEvent(eventId)` internal mutation exists but isn't wired to a UI button. To revoke a client's portal access:

```bash
# Via Convex dashboard → Functions → run with eventId
```

Phase 2 polish: add a "Revoke client portal access" button to the event detail page.

## 8. Known follow-ups (deferred to Phase 2 or later)

- Inline fee/deposit/balance editor on Finance & Legal tab (currently Convex-dashboard-only)
- Token-revocation button in admin UI
- Xero real implementation (OAuth + token refresh + secrets table + webhook route + wire into signContract)
- Reminder email templates polished + variant per offset (14d softer, 1d more direct)
- Contract version history on event (currently each `sendContract` overwrites; first signed version is the canonical one)
- PDF rendering of contract (currently HTML-only; Puppeteer or external service like browserless.io)
- Discovery call calendar invites (currently just a confirmation page; no `.ics` sent)
- Production Clerk keys + `clerk.lmeband.com` (still on dev keys with banner)
- Cookie/session sharing between `lmeband.com` (admin / Clerk) and `app.lmeband.com` — currently separate
