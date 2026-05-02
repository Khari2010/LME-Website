"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";

const CLERK_API = "https://api.clerk.com/v1";

function clerkHeaders() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY not set in Convex env");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export const listAllowlist = action({
  args: {},
  handler: async () => {
    const r = await fetch(`${CLERK_API}/allowlist_identifiers`, {
      headers: clerkHeaders(),
    });
    if (!r.ok) throw new Error(`Clerk API ${r.status}`);
    const data = await r.json();
    // Returns either an array directly or { data: [...] } depending on Clerk's response shape
    const items = Array.isArray(data) ? data : (data.data ?? []);
    return items.map(
      (i: { id: string; identifier: string; created_at: number }) => ({
        id: i.id,
        identifier: i.identifier,
        createdAt: i.created_at,
      }),
    );
  },
});

export const addToAllowlist = action({
  args: { identifier: v.string() },
  handler: async (_ctx, { identifier }) => {
    const email = identifier.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Invalid email");
    const r = await fetch(`${CLERK_API}/allowlist_identifiers`, {
      method: "POST",
      headers: clerkHeaders(),
      body: JSON.stringify({ identifier: email, notify: false }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => null);
      throw new Error(err?.errors?.[0]?.message ?? `Clerk API ${r.status}`);
    }
    return await r.json();
  },
});

export const removeFromAllowlist = action({
  args: { id: v.string() },
  handler: async (_ctx, { id }) => {
    const r = await fetch(`${CLERK_API}/allowlist_identifiers/${id}`, {
      method: "DELETE",
      headers: clerkHeaders(),
    });
    if (!r.ok) throw new Error(`Clerk API ${r.status}`);
    return { ok: true };
  },
});
