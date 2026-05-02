# Admin User Management — Design Spec

**Date:** 2026-05-02
**Status:** Approved (pending user review of this doc)
**Author:** Khari + Claude
**Supersedes:** Allowlist-based team management (shipped 2026-05-01, commit `e1ca04c`)

## Problem

Two issues observed on `lmeband.com/admin/team`:

1. **Invite link redirects to Clerk's hosted portal.** When Chris clicks "Set up my password" in the LME-branded invite email, he lands on `/admin/sign-up` momentarily, then `<SignUp />` bounces him to Clerk's hosted account portal subdomain instead of staying on `lmeband.com`. The cause is that the invitee has no Clerk session and no invitation ticket, so Clerk's component falls back to the hosted flow.
2. **No member visibility.** The Team page surfaces only the Clerk *allowlist* (3 emails permitted to sign up) — not the actual *users* who have signed up. Khari can't see who has accepted, when they last signed in, or revoke an active session. The Clerk dashboard surfaces all of this, but the in-app admin doesn't.

The user has approved the following direction:
- Switch invites to use Clerk's Invitations API so the ticket eliminates the portal bounce.
- Mirror Clerk users into a Convex `users` table so the admin UI has fast, queryable user data and a foundation for future role-based features.
- Retire the allowlist entirely — invitations replace it.

## Goals

- Chris (and every future invitee) can click the LME invite email button and complete sign-up entirely on `lmeband.com` — no Clerk subdomain bounce.
- Khari can see every member, their last sign-in, and their pending invites in one place.
- Khari can revoke an active session or remove a member from the band entirely, both with one click each.
- Convex becomes the canonical source of truth for "who is on the team", with Clerk as the authentication backend.
- Foundation laid for future role-based UI gating (e.g. "drafter" can save campaigns but not send) without shipping it now.

## Non-goals

- Role-based UI gating (Composer send-button gating, draft approval workflow). Schema field exists; no UI surface yet.
- Audit log of admin actions.
- Comments-on-drafts collaboration UI.
- Migrating /enhancers (fan) auth — this spec is admin-only.
- Moving admin to `app.lmeband.com` subdomain (still deferred).

## Architecture

```
┌────────────────────┐
│  /admin/team UI    │ ──reads── Convex users + invitations tables
│  (server comp)     │ ──writes─→ createInvitation, revokeSessions, removeMember actions
└────────────────────┘
           │
           │  actions call
           ▼
┌────────────────────┐
│  Clerk REST API    │  ←──────────  POST /v1/invitations
│                    │  ←──────────  DELETE /v1/users/{id}/sessions
│                    │  ←──────────  DELETE /v1/users/{id}
│                    │  ──webhook──→ /api/clerk/webhook
└────────────────────┘                       │
                                             ▼ Svix-verified
                                  ┌──────────────────────┐
                                  │  upsert/delete user  │
                                  │  flip invitation     │
                                  │  status              │
                                  └──────────────────────┘
                                             │
                                             ▼
                                       Convex tables
```

Clerk remains the auth backend (sessions, password, OAuth). Convex stores a denormalised mirror of users + the canonical record of invitations sent. The webhook keeps Convex consistent with Clerk; Convex is what the UI reads.

## Data model

### New table: `users`
```ts
users: defineTable({
  clerkUserId: v.string(),
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  role: v.union(
    v.literal("owner"),
    v.literal("admin"),
    v.literal("drafter"),
  ),
  joinedAt: v.number(),          // Clerk created_at
  lastSignInAt: v.optional(v.number()),
})
  .index("by_clerk_id", ["clerkUserId"])
  .index("by_email", ["email"]),
```

### New table: `invitations`
```ts
invitations: defineTable({
  email: v.string(),
  firstName: v.optional(v.string()),
  clerkInvitationId: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("revoked"),
    v.literal("expired"),
  ),
  invitedBy: v.string(),        // inviter's email or display name
  invitedAt: v.number(),
  acceptedAt: v.optional(v.number()),
})
  .index("by_email", ["email"])
  .index("by_clerk_id", ["clerkInvitationId"])
  .index("by_status", ["status"]),
```

### Roles, initial assignment

- Khari (`khari@millennialservices.co.uk`) → `admin`
- Chris (`chris@lmeband.com` and any other future members) → `admin`
- The role enum includes `owner` and `drafter` for future use; no UI exposes them in this spec.

## API surface (Convex actions)

All actions live under `convex/` and call Clerk's REST API with `CLERK_SECRET_KEY` from env.

### `convex/invitations.ts` (Node action file)
- `createInvitation({ email, firstName, invitedBy })`
  1. POST `/v1/invitations` with `{ email_address, redirect_url: ${SITE_URL}/admin/sign-up, public_metadata: { firstName } }`
  2. Insert row into Convex `invitations` (status `pending`, store `clerkInvitationId`)
  3. Send LME-branded email via Resend (existing template, but the button URL is now the `url` returned by Clerk's invitation response — this URL contains the `__clerk_ticket` token)
  4. Return `{ messageId, invitationId }`
- `listInvitations()` — returns Convex `invitations` rows where `status = pending`, newest first
- `revokeInvitation({ id })` — POST `/v1/invitations/{clerkId}/revoke` then update Convex row to `revoked`
- `resendInvitation({ id })` — revoke the existing one, then create a fresh invitation for the same email/firstName

### `convex/users.ts` (Node action file)
- `listUsers()` — returns Convex `users` rows, sorted by `joinedAt` desc
- `revokeUserSessions({ clerkUserId })` — DELETE `/v1/users/{clerkUserId}/sessions`
- `removeUser({ clerkUserId })` — DELETE `/v1/users/{clerkUserId}`; webhook will cascade-delete the Convex row, but action also deletes proactively for instant UI feedback
- `backfillFromClerk()` — one-time admin-triggered action that pulls all current Clerk users and upserts into Convex. Runs once after deploy.

### Removed
- `convex/allowlist.ts` — entire file deleted. All three current allowlist entries (`khari@…`, `chris@lmeband.com`, `ctrotmanoo@gmail.com`) get cleared from Clerk by a one-time cleanup action that calls `DELETE /v1/allowlist_identifiers/{id}` for each.

## Webhook: `/api/clerk/webhook`

New Next.js route handler at `src/app/api/clerk/webhook/route.ts` (POST only).

- Verifies the request using Svix signature headers (`svix-id`, `svix-timestamp`, `svix-signature`) against `CLERK_WEBHOOK_SECRET`. Reject with 400 on invalid signature.
- Switches on `type`:
  - `user.created` → upsert Convex `users` row from event payload; mark matching `invitations` row (by email) as `accepted` with `acceptedAt = now`
  - `user.updated` → patch Convex `users` row (name, image, etc.)
  - `user.deleted` → delete Convex `users` row by `clerkUserId`
  - `session.created` → patch matching Convex `users` row's `lastSignInAt = now`. Clerk fires this on every fresh session including OAuth callbacks, so this is effectively "last active" granularity, not strictly "last typed-password sign-in" — acceptable for the Members UI.
- Returns 200 on success, 500 on Convex error (Clerk retries with backoff).

## UI: `/admin/team` (rewrite)

Three sections, top to bottom, on the existing dark theme:

### Section 1 — Invite a member (form, mostly unchanged)
- Email + first name + Send Invite button
- Submits to `createInvitation` action
- Success state: green banner reading "Invite sent to <email>." (matches current UX)

### Section 2 — Members (N)
Table backed by Convex `useQuery(api.users.listUsers)`:

| Avatar | Name | Email | Role | Joined | Last sign-in | Actions |
|--------|------|-------|------|--------|--------------|---------|
| 32×32  | Khari George | khari@… | Admin | 1 May 2026 | Today, 12:04 | [Sign out] [Remove] |

- "Sign out" calls `revokeUserSessions`. Confirm modal: "Force <name> to sign in again?"
- "Remove" calls `removeUser`. Confirm modal: "Permanently remove <name> from the LME admin? They'll need a fresh invite to come back."
- Cannot remove yourself (button hidden if `clerkUserId === currentUserId`)

### Section 3 — Pending invites (N)
Table backed by `useQuery(api.invitations.listInvitations)`:

| Email | Invited by | Sent | Actions |
|-------|------------|------|---------|
| chris@lmeband.com | khari@… | 1 May 2026 | [Resend] [Revoke] |

- Empty state: "No pending invites." (only render the table if N > 0)
- Once Chris signs up, his row disappears from this section and appears in Members.

### Removed
- "Allowed emails" section gone entirely.

## Migration plan

1. **Schema deploy** — add `users` and `invitations` tables; deploy Convex.
2. **Clerk dashboard config** — confirm Restrictions are set to "Block all signups" (or equivalent), so only invitation tickets can sign up. Confirm Account Portal is **off** (Customization → Account Portal → toggle off if currently on).
3. **Webhook setup** — create webhook endpoint in Clerk dashboard pointing at `https://www.lmeband.com/api/clerk/webhook`; subscribe to `user.created`, `user.updated`, `user.deleted`, `session.created`. Copy signing secret into `CLERK_WEBHOOK_SECRET` env var (Convex + Vercel).
4. **Backfill** — manually trigger `backfillFromClerk()` once. Inserts Khari's user row.
5. **Allowlist cleanup** — manually trigger one-time action that deletes all three existing allowlist identifiers from Clerk.
6. **Code deploy** — ship the new UI + actions + webhook.
7. **Re-invite Chris** — Khari sends Chris a fresh invite via the new flow. Chris confirms he lands on `lmeband.com/admin/sign-up?__clerk_ticket=…` and completes sign-up without leaving the domain.
8. **Delete `convex/allowlist.ts`** in the same PR.

## Testing

Manual:
- New invite → recipient clicks email button → lands on `/admin/sign-up` with ticket in URL → completes sign-up → redirected to `/admin` → appears in Members section within a few seconds.
- Revoke a session on a logged-in user → that user's next request hits the auth gate.
- Remove a user → user disappears from Members; if they try the old invite link, they get an "invitation expired" message.
- Resend an invite → old ticket invalidated, new email arrives.
- Webhook signature failure → returns 400, no Convex write.

Automated: skipped for this iteration (matches the rest of the project's manual-test posture).

## Risks

- **Clerk dashboard config drift** — if "Account Portal" gets re-enabled in Clerk dashboard, the bounce returns. Mitigation: documented in this spec; check after any Clerk plan change.
- **Webhook outage** — if `/api/clerk/webhook` is down when a user signs up, Convex `users` won't get the row until `backfillFromClerk` is re-run manually. Acceptable for now (low traffic).
- **Race between webhook and UI** — invitee may briefly appear in both Members AND Pending after acceptance, until webhook fires. Acceptable; resolves within seconds.

## Out-of-scope follow-ups (next session, not this one)

- Role-editor UI on Members rows
- Composer send-button gating by role
- Audit log table + admin/audit page
- Move admin to `app.lmeband.com` subdomain
- Clerk production keys swap
