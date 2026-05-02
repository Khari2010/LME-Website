# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace allowlist-based team management with Clerk Invitations API + a Convex `users` mirror so admins can see/manage real users in `/admin/team` and Chris's invite link stays on `lmeband.com` instead of bouncing to Clerk's hosted portal.

**Architecture:** Clerk remains the auth backend (sessions, password, OAuth). Convex stores a denormalised mirror of users + the canonical record of invitations sent. A new Next.js webhook endpoint at `/api/clerk/webhook` keeps Convex in sync via Svix-verified Clerk events. Convex is what `/admin/team` reads.

**Tech Stack:** Next.js 16 App Router, Convex (queries/mutations + Node actions), Clerk Backend API (REST via fetch), `@clerk/nextjs/webhooks` for Svix verification, Resend for invite email.

**Spec reference:** `docs/superpowers/specs/2026-05-02-admin-user-management-design.md`

**Important — testing posture:** This project does not maintain a unit-test suite for marketing/admin features. Each task ends with a **manual verification step** (Convex dashboard, browser, or `pnpm build`) instead of `pnpm test`. Do not introduce new test files unless explicitly noted.

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `convex/schema.ts` | Modify | Add `users` and `invitations` tables with indexes |
| `convex/users.ts` | Create | Pure queries + mutations: list/upsert/delete users, patch lastSignIn |
| `convex/invitations.ts` | Create | Pure queries + mutations: list pending, insert invitation row, flip status |
| `convex/invitationsAdmin.ts` | Create | Node actions calling Clerk Invitations API + Resend (createInvitation, revokeInvitation, resendInvitation) |
| `convex/usersAdmin.ts` | Create | Node actions calling Clerk Backend API (revokeUserSessions, removeUser, backfillFromClerk, cleanupAllowlist) |
| `src/app/api/clerk/webhook/route.ts` | Create | POST handler that Svix-verifies Clerk events and updates Convex |
| `src/app/admin/(authed)/team/page.tsx` | Rewrite | New 3-section layout: Invite form / Members table / Pending invites table |
| `convex/team.ts` | Delete | `sendTeamInvite` logic moves into `invitationsAdmin.createInvitation` |
| `convex/allowlist.ts` | Delete | Replaced entirely by invitations flow |

---

## Task 1: Add users + invitations tables to schema

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add the two new tables**

Add these table definitions inside the `defineSchema({ ... })` object in `convex/schema.ts`, immediately after the closing `}),` of the existing `messages` table (i.e. as the last two tables before the outermost `})`):

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
    joinedAt: v.number(),
    lastSignInAt: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkUserId"])
    .index("by_email", ["email"]),

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
    invitedBy: v.string(),
    invitedAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkInvitationId"])
    .index("by_status", ["status"]),
```

- [ ] **Step 2: Push the schema to Convex dev**

Run: `pnpm dlx convex dev --once`
Expected: "Convex functions ready" with no schema errors. Both tables now exist.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add users + invitations tables for admin team mgmt"
```

---

## Task 2: Pure users queries + mutations

**Files:**
- Create: `convex/users.ts`

- [ ] **Step 1: Write the file**

```ts
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

const ROLE = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("drafter"),
);

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").collect();
    return rows.sort((a, b) => b.joinedAt - a.joinedAt);
  },
});

export const upsertUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.optional(ROLE),
    joinedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        // role only updated if explicitly provided; otherwise keep existing
        ...(args.role ? { role: args.role } : {}),
      });
      return existing._id;
    }
    return await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      imageUrl: args.imageUrl,
      role: args.role ?? "admin",
      joinedAt: args.joinedAt,
    });
  },
});

export const deleteUserByClerkId = mutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const row = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", clerkUserId))
      .first();
    if (row) await ctx.db.delete(row._id);
  },
});

export const patchLastSignIn = mutation({
  args: { clerkUserId: v.string(), at: v.number() },
  handler: async (ctx, { clerkUserId, at }) => {
    const row = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", clerkUserId))
      .first();
    if (row) await ctx.db.patch(row._id, { lastSignInAt: at });
  },
});
```

- [ ] **Step 2: Push to Convex dev**

Run: `pnpm dlx convex dev --once`
Expected: Functions compile. `api.users.listUsers`, `api.users.upsertUser`, etc. now appear in `convex/_generated/api.d.ts`.

- [ ] **Step 3: Smoke-test the query in Convex dashboard**

In the Convex dashboard → Functions → `users:listUsers` → Run with `{}`. Expected: returns `[]` (no users yet).

- [ ] **Step 4: Commit**

```bash
git add convex/users.ts
git commit -m "feat(convex): add users queries + mutations"
```

---

## Task 3: Pure invitations queries + mutations

**Files:**
- Create: `convex/invitations.ts`

- [ ] **Step 1: Write the file**

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const STATUS = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("revoked"),
  v.literal("expired"),
);

export const listPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("invitations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return rows.sort((a, b) => b.invitedAt - a.invitedAt);
  },
});

export const insertInvitation = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    clerkInvitationId: v.string(),
    invitedBy: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("invitations", {
      email: args.email.toLowerCase(),
      firstName: args.firstName,
      clerkInvitationId: args.clerkInvitationId,
      status: "pending",
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
    });
  },
});

export const setInvitationStatus = mutation({
  args: {
    clerkInvitationId: v.string(),
    status: STATUS,
  },
  handler: async (ctx, { clerkInvitationId, status }) => {
    const row = await ctx.db
      .query("invitations")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkInvitationId", clerkInvitationId),
      )
      .first();
    if (row) await ctx.db.patch(row._id, { status });
  },
});

export const markAcceptedByEmail = mutation({
  args: { email: v.string(), at: v.number() },
  handler: async (ctx, { email, at }) => {
    const lower = email.toLowerCase();
    const rows = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", lower))
      .collect();
    const pending = rows.find((r) => r.status === "pending");
    if (pending) {
      await ctx.db.patch(pending._id, { status: "accepted", acceptedAt: at });
    }
  },
});

export const getInvitationByClerkId = query({
  args: { clerkInvitationId: v.string() },
  handler: async (ctx, { clerkInvitationId }) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkInvitationId", clerkInvitationId),
      )
      .first();
  },
});
```

- [ ] **Step 2: Push to Convex dev**

Run: `pnpm dlx convex dev --once`
Expected: Functions compile.

- [ ] **Step 3: Smoke-test in Convex dashboard**

Run `invitations:listPendingInvitations` with `{}`. Expected: `[]`.

- [ ] **Step 4: Commit**

```bash
git add convex/invitations.ts
git commit -m "feat(convex): add invitations queries + mutations"
```

---

## Task 4: createInvitation Node action (Clerk + Resend)

**Files:**
- Create: `convex/invitationsAdmin.ts`

- [ ] **Step 1: Write the file with createInvitation only**

```ts
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Resend } from "resend";

const CLERK_API = "https://api.clerk.com/v1";
const SITE_URL = process.env.SITE_URL ?? "https://www.lmeband.com";
const FROM = process.env.ENHANCERS_FROM_ADDRESS ?? "enhancers@lmeband.com";

function clerkHeaders() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY not set in Convex env");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function inviteEmailHtml(inviterName: string, firstName: string | undefined, ticketUrl: string, recipientEmail: string) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey,";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#080808;font-family:Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#080808"><tr><td align="center" style="padding:40px 24px;"><table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;"><tr><td><p style="color:#14B8A6;font-size:14px;letter-spacing:0.3em;text-transform:uppercase;margin:0 0 16px;">LME · Admin</p><h1 style="color:#ffffff;font-size:36px;font-weight:700;margin:0 0 16px;line-height:1.1;">You're in.</h1><p style="color:#9ca3af;font-size:16px;line-height:1.6;margin:0 0 16px;">${greeting} ${inviterName} just added you to the LME admin platform — replacing MailChimp + giving the band a proper home for campaigns, contacts, bookings, and more.</p><p style="color:#9ca3af;font-size:16px;line-height:1.6;margin:0 0 32px;">Click below to set up your password and get in.</p><table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td style="background-color:#14B8A6;border-radius:6px;"><a href="${ticketUrl}" style="display:inline-block;padding:16px 32px;color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Set up my password</a></td></tr></table><p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 8px;">Use this email address to sign up: <strong style="color:#fff;">${recipientEmail}</strong>. The link is single-use and tied to your invite.</p><hr style="border:none;border-top:1px solid #1f2937;margin:32px 0 16px;"><p style="color:#6b7280;font-size:11px;line-height:1.6;margin:0;">If you weren't expecting this, you can ignore the email — nothing happens unless you click the link.<br>— LME</p></td></tr></table></td></tr></table></body></html>`;
}

export const createInvitation = action({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    invitedBy: v.string(),
  },
  handler: async (ctx, { email, firstName, invitedBy }) => {
    const lowered = email.trim().toLowerCase();
    if (!lowered.includes("@")) throw new Error("Invalid email");

    // 1. Clerk: create the invitation; this generates a __clerk_ticket
    const r = await fetch(`${CLERK_API}/invitations`, {
      method: "POST",
      headers: clerkHeaders(),
      body: JSON.stringify({
        email_address: lowered,
        redirect_url: `${SITE_URL}/admin/sign-up`,
        public_metadata: firstName ? { firstName } : {},
        notify: false,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => null);
      throw new Error(err?.errors?.[0]?.message ?? `Clerk API ${r.status}`);
    }
    const inv = (await r.json()) as { id: string; url: string };

    // 2. Convex: record the invitation
    await ctx.runMutation(api.invitations.insertInvitation, {
      email: lowered,
      firstName,
      clerkInvitationId: inv.id,
      invitedBy,
    });

    // 3. Resend: send the LME-branded email with the ticket URL as the CTA
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");
    const resend = new Resend(apiKey);
    const html = inviteEmailHtml(invitedBy, firstName, inv.url, lowered);
    const sendResult = await resend.emails.send({
      from: `LME <${FROM}>`,
      to: [lowered],
      subject: "You're in — set up your LME admin password",
      html,
    });
    if (sendResult.error) {
      throw new Error(`Resend error: ${sendResult.error.message}`);
    }
    return { invitationId: inv.id, messageId: sendResult.data?.id };
  },
});
```

- [ ] **Step 2: Push to Convex dev**

Run: `pnpm dlx convex dev --once`
Expected: Compiles. `api.invitationsAdmin.createInvitation` available.

- [ ] **Step 3: Verify the env vars Convex needs are set**

Run: `pnpm dlx convex env list`
Confirm these are present (they were already used by `team.ts` and `allowlist.ts`):
- `CLERK_SECRET_KEY`
- `RESEND_API_KEY`
- `SITE_URL`
- `ENHANCERS_FROM_ADDRESS` (optional — falls back to `enhancers@lmeband.com`)

If any missing, set with: `pnpm dlx convex env set <NAME> <value>`

- [ ] **Step 4: Manual smoke-test (skip if you don't want a test invite landing in your inbox)**

In Convex dashboard → Functions → `invitationsAdmin:createInvitation` → Run with:
```json
{ "email": "khari+test@millennialservices.co.uk", "firstName": "Khari", "invitedBy": "Khari" }
```
Expected: returns `{ invitationId, messageId }`. Check inbox for the LME-branded email. Click the button — confirm the URL contains `__clerk_ticket=…` and lands on `lmeband.com/admin/sign-up?...`.

If you don't want to consume a test invite, skip this step — it's verified end-to-end in Task 13.

- [ ] **Step 5: Commit**

```bash
git add convex/invitationsAdmin.ts
git commit -m "feat(convex): add createInvitation action using Clerk Invitations API"
```

---

## Task 5: revokeInvitation + resendInvitation actions

**Files:**
- Modify: `convex/invitationsAdmin.ts`

- [ ] **Step 1: Append to the file (after `createInvitation`)**

```ts
export const revokeInvitation = action({
  args: { clerkInvitationId: v.string() },
  handler: async (ctx, { clerkInvitationId }) => {
    const r = await fetch(
      `${CLERK_API}/invitations/${clerkInvitationId}/revoke`,
      { method: "POST", headers: clerkHeaders() },
    );
    if (!r.ok) throw new Error(`Clerk API ${r.status}`);
    await ctx.runMutation(api.invitations.setInvitationStatus, {
      clerkInvitationId,
      status: "revoked",
    });
    return { ok: true };
  },
});

export const resendInvitation = action({
  args: { clerkInvitationId: v.string(), invitedBy: v.string() },
  handler: async (ctx, { clerkInvitationId, invitedBy }) => {
    const existing = await ctx.runQuery(api.invitations.getInvitationByClerkId, {
      clerkInvitationId,
    });
    if (!existing) throw new Error("Invitation not found");
    // Revoke the old one first (Clerk doesn't allow duplicate pending invites for same email)
    await fetch(`${CLERK_API}/invitations/${clerkInvitationId}/revoke`, {
      method: "POST",
      headers: clerkHeaders(),
    }).catch(() => {});
    await ctx.runMutation(api.invitations.setInvitationStatus, {
      clerkInvitationId,
      status: "revoked",
    });
    // Now create a fresh one — re-uses createInvitation's Clerk + Resend + Convex logic
    return await ctx.runAction(api.invitationsAdmin.createInvitation, {
      email: existing.email,
      firstName: existing.firstName,
      invitedBy,
    });
  },
});
```

- [ ] **Step 2: Push to Convex dev**

Run: `pnpm dlx convex dev --once`
Expected: Compiles.

- [ ] **Step 3: Commit**

```bash
git add convex/invitationsAdmin.ts
git commit -m "feat(convex): add revokeInvitation + resendInvitation actions"
```

---

## Task 6: User admin actions (revoke sessions, remove user, backfill)

**Files:**
- Create: `convex/usersAdmin.ts`

- [ ] **Step 1: Write the file**

```ts
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const CLERK_API = "https://api.clerk.com/v1";

function clerkHeaders() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY not set in Convex env");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export const revokeUserSessions = action({
  args: { clerkUserId: v.string() },
  handler: async (_ctx, { clerkUserId }) => {
    // List active sessions, then revoke each
    const r = await fetch(
      `${CLERK_API}/sessions?user_id=${encodeURIComponent(clerkUserId)}&status=active`,
      { headers: clerkHeaders() },
    );
    if (!r.ok) throw new Error(`Clerk API ${r.status}`);
    const data = await r.json();
    const sessions = (Array.isArray(data) ? data : (data.data ?? [])) as { id: string }[];
    for (const s of sessions) {
      await fetch(`${CLERK_API}/sessions/${s.id}/revoke`, {
        method: "POST",
        headers: clerkHeaders(),
      });
    }
    return { revokedCount: sessions.length };
  },
});

export const removeUser = action({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    // Delete in Clerk (will fire user.deleted webhook → Convex cascade)
    const r = await fetch(`${CLERK_API}/users/${clerkUserId}`, {
      method: "DELETE",
      headers: clerkHeaders(),
    });
    if (!r.ok) throw new Error(`Clerk API ${r.status}`);
    // Proactively delete in Convex too for instant UI feedback
    await ctx.runMutation(api.users.deleteUserByClerkId, { clerkUserId });
    return { ok: true };
  },
});

export const backfillFromClerk = action({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    let offset = 0;
    const limit = 100;
    while (true) {
      const r = await fetch(
        `${CLERK_API}/users?limit=${limit}&offset=${offset}&order_by=-created_at`,
        { headers: clerkHeaders() },
      );
      if (!r.ok) throw new Error(`Clerk API ${r.status}`);
      const data = await r.json();
      const users = (Array.isArray(data) ? data : (data.data ?? [])) as Array<{
        id: string;
        email_addresses: { email_address: string; id: string }[];
        primary_email_address_id: string | null;
        first_name: string | null;
        last_name: string | null;
        image_url: string | null;
        created_at: number;
        last_sign_in_at: number | null;
      }>;
      if (users.length === 0) break;
      for (const u of users) {
        const primaryEmail =
          u.email_addresses.find((e) => e.id === u.primary_email_address_id)?.email_address ??
          u.email_addresses[0]?.email_address;
        if (!primaryEmail) continue;
        await ctx.runMutation(api.users.upsertUser, {
          clerkUserId: u.id,
          email: primaryEmail.toLowerCase(),
          firstName: u.first_name ?? undefined,
          lastName: u.last_name ?? undefined,
          imageUrl: u.image_url ?? undefined,
          role: "admin",
          joinedAt: u.created_at,
        });
        if (u.last_sign_in_at) {
          await ctx.runMutation(api.users.patchLastSignIn, {
            clerkUserId: u.id,
            at: u.last_sign_in_at,
          });
        }
        inserted++;
      }
      if (users.length < limit) break;
      offset += limit;
    }
    return { backfilledCount: inserted };
  },
});

export const cleanupAllowlist = action({
  args: {},
  handler: async () => {
    // One-shot: delete every existing Clerk allowlist identifier
    const r = await fetch(`${CLERK_API}/allowlist_identifiers`, {
      headers: clerkHeaders(),
    });
    if (!r.ok) throw new Error(`Clerk API ${r.status}`);
    const data = await r.json();
    const items = (Array.isArray(data) ? data : (data.data ?? [])) as { id: string; identifier: string }[];
    for (const item of items) {
      await fetch(`${CLERK_API}/allowlist_identifiers/${item.id}`, {
        method: "DELETE",
        headers: clerkHeaders(),
      });
    }
    return { deletedCount: items.length, deleted: items.map((i) => i.identifier) };
  },
});
```

- [ ] **Step 2: Push to Convex dev**

Run: `pnpm dlx convex dev --once`
Expected: Compiles. New actions visible in `convex/_generated/api.d.ts`.

- [ ] **Step 3: Commit**

```bash
git add convex/usersAdmin.ts
git commit -m "feat(convex): add user admin actions + allowlist cleanup"
```

---

## Task 7: Clerk webhook route (Svix-verified)

**Files:**
- Create: `src/app/api/clerk/webhook/route.ts`

- [ ] **Step 1: Write the route handler**

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function POST(req: NextRequest) {
  if (!CONVEX_URL) {
    return NextResponse.json({ error: "Convex URL missing" }, { status: 500 });
  }

  let evt: { type: string; data: Record<string, unknown> };
  try {
    evt = (await verifyWebhook(req)) as { type: string; data: Record<string, unknown> };
  } catch (err) {
    console.error("[clerk webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(CONVEX_URL);

  try {
    switch (evt.type) {
      case "user.created":
      case "user.updated": {
        const u = evt.data as {
          id: string;
          email_addresses: { email_address: string; id: string }[];
          primary_email_address_id: string | null;
          first_name: string | null;
          last_name: string | null;
          image_url: string | null;
          created_at: number;
        };
        const primaryEmail =
          u.email_addresses.find((e) => e.id === u.primary_email_address_id)?.email_address ??
          u.email_addresses[0]?.email_address;
        if (!primaryEmail) break;
        await convex.mutation(api.users.upsertUser, {
          clerkUserId: u.id,
          email: primaryEmail.toLowerCase(),
          firstName: u.first_name ?? undefined,
          lastName: u.last_name ?? undefined,
          imageUrl: u.image_url ?? undefined,
          role: "admin",
          joinedAt: u.created_at,
        });
        if (evt.type === "user.created") {
          await convex.mutation(api.invitations.markAcceptedByEmail, {
            email: primaryEmail,
            at: Date.now(),
          });
        }
        break;
      }
      case "user.deleted": {
        const u = evt.data as { id: string };
        await convex.mutation(api.users.deleteUserByClerkId, { clerkUserId: u.id });
        break;
      }
      case "session.created": {
        const s = evt.data as { user_id: string; created_at: number };
        await convex.mutation(api.users.patchLastSignIn, {
          clerkUserId: s.user_id,
          at: s.created_at,
        });
        break;
      }
      default:
        // Ignore other events
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[clerk webhook] processing error", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build is clean**

Run: `pnpm build`
Expected: Build succeeds. No TypeScript errors. The `verifyWebhook` import resolves (it's exported from `@clerk/nextjs/webhooks` since v5+; current installed version is `^7.3.0` which supports it).

If `verifyWebhook` is not exported in this version, fall back to using `svix` directly:
- Install: `pnpm add svix`
- Replace verification block with:
  ```ts
  import { Webhook } from "svix";
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };
  const wh = new Webhook(secret);
  evt = wh.verify(payload, headers) as typeof evt;
  ```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/clerk/webhook/route.ts package.json pnpm-lock.yaml
git commit -m "feat(api): add Clerk webhook handler to sync users into Convex"
```

(Stage `package.json`/`pnpm-lock.yaml` only if you fell back to installing `svix`.)

---

## Task 8: Rewrite /admin/team page

**Files:**
- Modify: `src/app/admin/(authed)/team/page.tsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Overwrite `src/app/admin/(authed)/team/page.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../../convex/_generated/api";

type Toast = { kind: "ok" | "err" | "info"; msg: string } | null;

export default function TeamPage() {
  const { user } = useUser();
  const members = useQuery(api.users.listUsers) ?? [];
  const pending = useQuery(api.invitations.listPendingInvitations) ?? [];

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const createInvitation = useAction(api.invitationsAdmin.createInvitation);
  const revokeInvitation = useAction(api.invitationsAdmin.revokeInvitation);
  const resendInvitation = useAction(api.invitationsAdmin.resendInvitation);
  const revokeUserSessions = useAction(api.usersAdmin.revokeUserSessions);
  const removeUser = useAction(api.usersAdmin.removeUser);

  const inviterName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? "Someone";
  const myClerkId = user?.id;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || adding) return;
    setAdding(true);
    setToast({ kind: "info", msg: `Sending invite to ${email}…` });
    try {
      await createInvitation({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim() || undefined,
        invitedBy: inviterName,
      });
      setToast({ kind: "ok", msg: `Invite sent to ${email}.` });
      setEmail("");
      setFirstName("");
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Invite failed",
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleRevokeSessions(clerkUserId: string, label: string) {
    if (!confirm(`Force ${label} to sign in again?`)) return;
    try {
      const result = await revokeUserSessions({ clerkUserId });
      setToast({
        kind: "ok",
        msg: `Revoked ${result.revokedCount} session${result.revokedCount === 1 ? "" : "s"} for ${label}.`,
      });
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Revoke failed",
      });
    }
  }

  async function handleRemoveUser(clerkUserId: string, label: string) {
    if (!confirm(`Permanently remove ${label} from the LME admin? They'll need a fresh invite to come back.`)) return;
    try {
      await removeUser({ clerkUserId });
      setToast({ kind: "ok", msg: `Removed ${label}.` });
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Remove failed",
      });
    }
  }

  async function handleRevokeInvite(clerkInvitationId: string, inviteEmail: string) {
    if (!confirm(`Revoke the invite for ${inviteEmail}?`)) return;
    try {
      await revokeInvitation({ clerkInvitationId });
      setToast({ kind: "ok", msg: `Revoked invite for ${inviteEmail}.` });
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Revoke failed",
      });
    }
  }

  async function handleResendInvite(clerkInvitationId: string, inviteEmail: string) {
    try {
      await resendInvitation({ clerkInvitationId, invitedBy: inviterName });
      setToast({ kind: "ok", msg: `Resent invite to ${inviteEmail}.` });
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Resend failed",
      });
    }
  }

  function fmtDate(ts: number) {
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtRelative(ts: number | undefined) {
    if (!ts) return "—";
    const days = Math.floor((Date.now() - ts) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return fmtDate(ts);
  }
  function displayName(m: { firstName?: string; lastName?: string; email: string }) {
    const full = [m.firstName, m.lastName].filter(Boolean).join(" ");
    return full || m.email;
  }

  return (
    <div className="space-y-6 text-white">
      <header>
        <p className="text-xs uppercase tracking-widest text-teal-400">LME · Admin</p>
        <h1 className="text-3xl font-bold mt-1">Team</h1>
        <p className="text-gray-500 text-sm mt-1">
          Invite band members. Each invite is single-use — recipients land on lmeband.com to set their password.
        </p>
      </header>

      {toast && (
        <div
          className={`rounded px-4 py-2 text-sm ${
            toast.kind === "ok"
              ? "bg-teal-950/40 border border-teal-900 text-teal-300"
              : toast.kind === "err"
                ? "bg-red-950/40 border border-red-900 text-red-300"
                : "bg-gray-900/50 border border-gray-800 text-gray-300"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Invite form */}
      <section className="bg-[#111111] border border-[#252525] rounded-xl p-6">
        <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-4">Invite a member</h2>
        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label htmlFor="invite-email" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
              Email *
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reuben@lmeband.com"
              className="w-full bg-[#0a0a0a] border border-[#252525] text-white px-3 py-2 rounded text-sm focus:border-teal-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="invite-firstName" className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
              First name
            </label>
            <input
              id="invite-firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Reuben"
              className="w-full bg-[#0a0a0a] border border-[#252525] text-white px-3 py-2 rounded text-sm focus:border-teal-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !email.trim()}
            className="bg-teal-400 text-black uppercase tracking-wider font-bold text-sm px-5 py-2 rounded hover:bg-teal-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {adding ? "Sending…" : "Send invite"}
          </button>
        </form>
      </section>

      {/* Members table */}
      <section className="bg-[#111111] border border-[#252525] rounded-xl p-6">
        <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-4">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="text-gray-500 text-sm">No members yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-[#252525]">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Joined</th>
                <th className="py-2 pr-4">Last sign-in</th>
                <th className="py-2 pr-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const label = displayName(m);
                const isMe = myClerkId === m.clerkUserId;
                return (
                  <tr key={m._id} className="border-b border-[#1f1f1f]">
                    <td className="py-2 pr-4 flex items-center gap-3">
                      {m.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#252525] grid place-items-center text-xs text-gray-400">
                          {(m.firstName?.[0] ?? m.email[0]).toUpperCase()}
                        </div>
                      )}
                      <span className="text-white">{label}</span>
                      {isMe && <span className="text-xs text-gray-500">(you)</span>}
                    </td>
                    <td className="py-2 pr-4 text-gray-300">{m.email}</td>
                    <td className="py-2 pr-4">
                      <span className="text-xs uppercase tracking-widest text-teal-300 bg-teal-950/40 border border-teal-900 px-2 py-0.5 rounded">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{fmtDate(m.joinedAt)}</td>
                    <td className="py-2 pr-4 text-gray-500">{fmtRelative(m.lastSignInAt)}</td>
                    <td className="py-2 pr-4 text-right space-x-3">
                      {!isMe && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRevokeSessions(m.clerkUserId, label)}
                            className="text-gray-400 hover:text-gray-200 text-xs uppercase tracking-widest"
                          >
                            Sign out
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(m.clerkUserId, label)}
                            className="text-red-400 hover:text-red-300 text-xs uppercase tracking-widest"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Pending invites */}
      {pending.length > 0 && (
        <section className="bg-[#111111] border border-[#252525] rounded-xl p-6">
          <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-4">
            Pending invites ({pending.length})
          </h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-[#252525]">
              <tr>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Invited by</th>
                <th className="py-2 pr-4">Sent</th>
                <th className="py-2 pr-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((inv) => (
                <tr key={inv._id} className="border-b border-[#1f1f1f]">
                  <td className="py-2 pr-4 text-white">{inv.email}</td>
                  <td className="py-2 pr-4 text-gray-500">{inv.invitedBy}</td>
                  <td className="py-2 pr-4 text-gray-500">{fmtRelative(inv.invitedAt)}</td>
                  <td className="py-2 pr-4 text-right space-x-3">
                    <button
                      type="button"
                      onClick={() => handleResendInvite(inv.clerkInvitationId, inv.email)}
                      className="text-gray-400 hover:text-gray-200 text-xs uppercase tracking-widest"
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(inv.clerkInvitationId, inv.email)}
                      className="text-red-400 hover:text-red-300 text-xs uppercase tracking-widest"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build is clean**

Run: `pnpm build`
Expected: Build succeeds. The page lints clean.

- [ ] **Step 3: Run dev server and view the page**

Run: `pnpm dev`
Visit `http://localhost:3002/admin/team`. Expected:
- Header + invite form render
- Members section says "No members yet." (empty until backfill in Task 10)
- Pending invites section is hidden (no pending yet)
- No console errors

Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/\(authed\)/team/page.tsx
git commit -m "feat(admin): rewrite /admin/team with members + pending invites tables"
```

---

## Task 9: Manual — Clerk dashboard configuration

**Files:** none (Clerk dashboard work, performed by Khari)

This task is operational, not code. It must be done **before** Task 10 so the webhook is live before the first invite is sent.

- [ ] **Step 1: Confirm Account Portal is OFF**

Open https://dashboard.clerk.com → LME Band → Development → **Customization** → **Account Portal**.
- Toggle "Use Account Portal" to **Off** (if on).
- This makes Clerk respect our embedded `<SignUp />` component instead of redirecting.

- [ ] **Step 2: Confirm Restrictions allow invitations**

Clerk dashboard → **User & Authentication** → **Restrictions**.
- Set sign-up mode to "Block all sign-ups" (invitations bypass this restriction by design — they carry a ticket).
- Confirm "Email address" is the only required identifier.

- [ ] **Step 3: Add the webhook endpoint**

Clerk dashboard → **Webhooks** → **Add Endpoint**.
- Endpoint URL: `https://www.lmeband.com/api/clerk/webhook`
- Subscribe to events: `user.created`, `user.updated`, `user.deleted`, `session.created`
- Click Create.
- Copy the **Signing Secret** (starts with `whsec_…`).

- [ ] **Step 4: Set the webhook secret in env**

Set in Vercel (production):
- Vercel dashboard → LME-Website project → Settings → Environment Variables
- Add `CLERK_WEBHOOK_SECRET=whsec_…` (Production scope)

Set locally for `pnpm dev` testing:
- Append to `.env.local`: `CLERK_WEBHOOK_SECRET=whsec_…`

- [ ] **Step 5: Confirm in this checklist**

Tick when all four sub-steps done. No commit needed (no code changed in this task).

---

## Task 10: Deploy + run one-time backfill + allowlist cleanup

**Files:** none (operational)

- [ ] **Step 1: Deploy the current branch to production**

If on `main` and intending to ship: `git push origin main`. Vercel auto-deploys.
If on a feature branch: open a PR, merge, let Vercel auto-deploy.
Wait for green deployment in Vercel dashboard.

- [ ] **Step 2: Run the backfill action against production Convex**

Open the Convex dashboard for the production deployment → Functions → `usersAdmin:backfillFromClerk` → Run with `{}`.
Expected: returns `{ backfilledCount: 1 }` (just Khari for now).
Verify: navigate to `https://www.lmeband.com/admin/team`. Khari now appears in the Members section with avatar, joined date, last sign-in.

- [ ] **Step 3: Run the allowlist cleanup action**

Convex dashboard → Functions → `usersAdmin:cleanupAllowlist` → Run with `{}`.
Expected: returns `{ deletedCount: 3, deleted: ["chris@lmeband.com", "ctrotmanoo@gmail.com", "khari@millennialservices.co.uk"] }`.
Verify in Clerk dashboard → User & Authentication → Restrictions → Allowlist. Should be empty.

- [ ] **Step 4: Commit (no-op marker, only if anything changed)**

If anything changed in code during this task (env files), commit them. Otherwise skip.

---

## Task 11: Delete legacy allowlist + team modules

**Files:**
- Delete: `convex/team.ts`
- Delete: `convex/allowlist.ts`

- [ ] **Step 1: Delete the files**

```bash
git rm convex/team.ts convex/allowlist.ts
```

- [ ] **Step 2: Verify no other code still references them**

```bash
grep -rn "api\.team\.\|api\.allowlist\." src/ convex/ 2>&1 | grep -v "_generated"
```
Expected: no results. (`/admin/team/page.tsx` no longer references either after Task 8's rewrite; nothing else does.)

- [ ] **Step 3: Push to Convex dev to regenerate api**

Run: `pnpm dlx convex dev --once`
Expected: Compiles. `convex/_generated/api.d.ts` no longer exports `team` or `allowlist` namespaces.

- [ ] **Step 4: Verify build is clean**

Run: `pnpm build`
Expected: Succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A convex/ src/
git commit -m "chore(convex): retire team.ts + allowlist.ts (replaced by invitations + users)"
```

---

## Task 12: End-to-end verification with Chris

**Files:** none (verification)

- [ ] **Step 1: Khari sends Chris a fresh invite**

On the live site `https://www.lmeband.com/admin/team`:
- Enter `chris@lmeband.com` and "Chris"
- Click "Send invite"
- Expected: green toast "Invite sent to chris@lmeband.com." Within ~2 seconds, a row appears in **Pending invites**.

- [ ] **Step 2: Confirm in Convex**

Convex dashboard → Tables → `invitations`. Row exists with `status: "pending"`, `email: "chris@lmeband.com"`, valid `clerkInvitationId`.

- [ ] **Step 3: Confirm in Resend**

Resend dashboard → Emails. The most recent send is to `chris@lmeband.com`, subject "You're in — set up your LME admin password".

- [ ] **Step 4: Chris completes sign-up**

Tell Chris to:
- Open the email
- Click "Set up my password"
- Confirm in browser address bar that the URL is `https://www.lmeband.com/admin/sign-up?__clerk_ticket=…` (NOT a `clerk.accounts.dev` or hosted Clerk subdomain)
- Set a password OR continue with Google
- He should be redirected to `https://www.lmeband.com/admin` (the dashboard)

- [ ] **Step 5: Verify Chris appears as a Member**

Refresh `https://www.lmeband.com/admin/team`:
- Chris's row appears in Members with avatar/initial, "Admin" badge, today's joined date, "Today" last sign-in
- Chris's row is gone from Pending invites
- Convex `users` table has a new row for Chris
- Convex `invitations` table row for Chris is now `status: "accepted"` with `acceptedAt` timestamp

- [ ] **Step 6: Sanity check the destructive actions (optional, only if you want to verify them safely)**

Either:
- Send a throwaway invite to a `+test` alias on your inbox, accept it, then test "Sign out" and "Remove" against that test member.
- Or just trust the implementation for now.

- [ ] **Step 7: Update the project handoff memory**

This step is for Claude/Khari at end of session — document the fix in `~/.claude/projects/-Users-khari-Documents-GitHub-LME-Website/memory/`. Not a commit.

---

## Self-Review Notes

**Spec coverage:**
- ✅ Switch invites to Clerk Invitations API → Task 4
- ✅ Convex `users` table → Task 1
- ✅ Convex `invitations` table → Task 1
- ✅ Webhook handler → Task 7
- ✅ Members panel UI → Task 8 (Section 2)
- ✅ Pending invites panel UI → Task 8 (Section 3)
- ✅ Allowlist removed → Task 9 step (clean) + Task 11 (delete code)
- ✅ Roles enum present, no UI exposed → Task 1 + Task 8 (read-only badge only)
- ✅ Backfill action → Task 6 + Task 10 step 2
- ✅ Allowlist cleanup action → Task 6 + Task 10 step 3
- ✅ Manual Clerk dashboard config → Task 9
- ✅ End-to-end verification with Chris → Task 12

**Placeholders:** none.
**Type consistency:** `clerkUserId`, `clerkInvitationId`, `role` enum, status enum used identically across schema, mutations, actions, and UI.
**Scope:** Single coherent admin user-management feature. Implementable in 1 session.
