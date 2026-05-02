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
