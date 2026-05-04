# Phase 1a — Deploy Notes

Manual steps required to ship Phase 1a (Bookings MVP) to production. The code is on `feat/phase-1a-bookings-mvp`; these steps prepare the runtime environment.

## 1. DNS — `app.lmeband.com` subdomain

**At your domain registrar** (where `lmeband.com` is registered):

Add a CNAME record:

```
Type:  CNAME
Name:  app
Value: cname.vercel-dns.com
TTL:   300
```

(The exact CNAME target value will be shown in Vercel after step 2 — use whatever Vercel provides if it differs.)

DNS propagation: 5–15 minutes typically.

## 2. Vercel — add the subdomain to the project

1. Visit Vercel dashboard → project `lme-website` → **Settings** → **Domains**
2. Click **Add Domain**, enter `app.lmeband.com`, click **Add**
3. Vercel will verify the DNS CNAME and provision an SSL certificate automatically (5–15 min)
4. Once verified, the domain shows as **Configured** with a green check

## 3. Vercel environment variables

The Convex public inquiry confirmation email needs a verified Resend sender. In Vercel **Settings → Environment Variables**, set:

```
BOOKINGS_FROM_ADDRESS=enquiries@lmeband.com
```

(If `enquiries@lmeband.com` isn't yet verified in Resend, either verify it OR set this variable to an already-verified address like `enhancers@lmeband.com`.)

Confirm the existing variables are still present:
- `RESEND_API_KEY` — used by the public inquiry confirmation email
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk auth
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL

Optionally add for prod-only Convex auto-deploy:
- `CONVEX_DEPLOY_KEY` — generate at Convex dashboard → Settings → Deploy Keys → New Production Deploy Key

## 4. Convex — push schema + functions to production

The `feat/phase-1a-bookings-mvp` branch carries new Convex code (events table replacement, events queries, public inquiry mutation, migration helpers). Push to production Convex BEFORE merging the PR (otherwise Vercel will deploy an app expecting Convex functions that don't exist yet).

```bash
# From a local checkout on feat/phase-1a-bookings-mvp
pnpm dlx convex login            # one-time, browser auth
pnpm dlx convex deploy --prod
```

Or, if a `CONVEX_DEPLOY_KEY` is set:

```bash
CONVEX_DEPLOY_KEY=prod:judicious-lapwing-125|… pnpm dlx convex deploy
```

Verify the production deployment URL matches what's in Vercel:

```bash
pnpm dlx convex deployment status --prod
```

## 5. Resend — verify sender + webhook (already partially set up)

Already configured for the email program (see prior session notes); double-check:

1. **Resend domain `lmeband.com` verified** with all three DNS records (SPF, DKIM, MX/return-path). Verify at Resend → Domains.
2. **`enquiries@lmeband.com` is a valid sender** under that domain (Resend allows any address on a verified domain by default — no per-address verification needed).
3. **Webhook** at `https://www.lmeband.com/api/resend/webhook` registered for `email.*` events (existing — not a Phase 1a requirement, but verify it still works).

## 6. Migrate existing bookings (one-shot)

After Convex prod is deployed and the new code is live:

```bash
# Locally, with NOTION_API_KEY in .env.local
NEXT_PUBLIC_CONVEX_URL=https://judicious-lapwing-125.convex.cloud \
  CONVEX_DEPLOY_KEY=prod:… \
  pnpm migrate:bookings
```

The script logs progress every 25 bookings. Spot-check the result in Convex dashboard:

- All bookings appear under `events` with `family=ExternalBooking`
- Statuses correctly mapped (Notion "Deposit Paid" → Convex "Booked", etc.)
- Bria + Kris Wedding shows up with the right fee/deposit/venue

**Re-run safety:** the script is NOT idempotent. If you need to re-run, first delete the existing imported events (or scope a `family=ExternalBooking` wipe).

## 7. Smoke test the production deploy

Once DNS is live + Convex is pushed + Vercel deployment succeeds:

| Surface | URL | Expected |
|---|---|---|
| Public homepage | https://lmeband.com | Renders normally |
| Public booking form | https://lmeband.com/bookingform | Submits → creates `events` row with `status=Inquiry` in Convex; client receives confirmation email from `enquiries@lmeband.com` |
| App home | https://app.lmeband.com | Redirects to `/sign-in` if not authed; redirects to `/dashboard` if authed |
| App sign-in | https://app.lmeband.com/sign-in | Clerk widget renders |
| Dashboard | https://app.lmeband.com/dashboard | Shows role, bookings list section |
| Pipeline | https://app.lmeband.com/events/external-bookings | 8-column kanban with migrated bookings + any new inquiries |
| Event detail | https://app.lmeband.com/events/&lt;id&gt; | Tabs work; notes save on blur; status changes persist |
| Calendar | https://app.lmeband.com/events/calendar | Month grid shows events on their dates |
| Theme toggle | header button | Flips light/dark, persists across reload |

## 8. Cookie/session caveats

- The `app.lmeband.com` and `lmeband.com` are different hostnames. **Sessions are NOT shared** between them (Clerk cookies are per-domain). A user signed into `lmeband.com/admin` is NOT automatically signed into `app.lmeband.com`. They need to sign in separately the first time. (Phase-1b polish: configure Clerk's session sharing or use `clerk.lmeband.com` shared subdomain.)

## 9. Known follow-ups (deferred to Phase 1b polish or Task 15)

- Manual hostname-routing smoke test (Task 4 didn't add automated tests)
- Sign-up route for new team-member onboarding (currently only sign-in exists at app.lmeband.com)
- Clerk production keys (currently dev keys with the "Development mode" badge)
- Custom Clerk domain `clerk.lmeband.com` for unified admin/app session sharing
