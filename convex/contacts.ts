import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// NOTE: This must match MAGIC_LINK_TTL_MS in src/lib/enhancers/tokens.ts.
// Convex functions can't easily import from src/, so we duplicate the constant
// here. If you change one, change both.
const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  return crypto.randomUUID();
}

export const signupOrLogin = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalised = email.trim().toLowerCase();
    if (!normalised.includes("@")) {
      throw new Error("Invalid email");
    }

    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", normalised))
      .first();

    const token = generateToken();
    const now = Date.now();

    let contactId;
    let isNewSignup = false;
    if (!existing) {
      isNewSignup = true;
      contactId = await ctx.db.insert("contacts", {
        email: normalised,
        source: "enhancers-signup",
        tags: ["enhancer"],
        status: "active",
        signupDate: now,
        magicLinkToken: token,
        magicLinkIssuedAt: now,
      });
    } else {
      contactId = existing._id;
      await ctx.db.patch(contactId, {
        status: "active",
        magicLinkToken: token,
        magicLinkIssuedAt: now,
      });
    }

    // Schedule the welcome email (delivered by convex/emails.ts).
    await ctx.scheduler.runAfter(0, internal.emails.sendEnhancerWelcomeEmail, {
      contactId,
      token,
      isNewSignup,
    });

    return { ok: true };
  },
});

export const redeemMagicLink = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_magic_token", (q) => q.eq("magicLinkToken", token))
      .first();

    if (!contact || !contact.magicLinkIssuedAt) {
      throw new Error("Invalid or expired link");
    }

    if (Date.now() - contact.magicLinkIssuedAt >= MAGIC_LINK_TTL_MS) {
      throw new Error("Link expired");
    }

    await ctx.db.patch(contact._id, {
      magicLinkToken: undefined,
      lastActive: Date.now(),
    });

    return { contactId: contact._id };
  },
});

export const getContactById = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, { id }): Promise<Doc<"contacts"> | null> => {
    return await ctx.db.get(id);
  },
});

export const getEnhancersDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("contacts").collect();
    const active = all.filter((c) => c.status === "active");
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      total: active.length,
      last7: active.filter((c) => c.signupDate >= sevenDaysAgo).length,
      last30: active.filter((c) => c.signupDate >= thirtyDaysAgo).length,
    };
  },
});

export const getRecentSignups = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const all = await ctx.db.query("contacts").order("desc").take(limit ?? 10);
    return all.map((c) => ({
      _id: c._id,
      email: c.email,
      name: c.name,
      signupDate: c.signupDate,
      status: c.status,
    }));
  },
});

export const bulkUpsertContacts = mutation({
  args: {
    contacts: v.array(
      v.object({
        email: v.string(),
        name: v.optional(v.string()),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        tags: v.array(v.string()),
        signupDate: v.number(),
      }),
    ),
  },
  handler: async (ctx, { contacts }) => {
    let created = 0;
    let updated = 0;
    for (const c of contacts) {
      const email = c.email.trim().toLowerCase();
      if (!email.includes("@")) continue;
      const existing = await ctx.db
        .query("contacts")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          name: c.name ?? existing.name,
          firstName: c.firstName ?? existing.firstName,
          lastName: c.lastName ?? existing.lastName,
          tags: Array.from(new Set([...(existing.tags ?? []), ...c.tags])),
        });
        updated++;
      } else {
        await ctx.db.insert("contacts", {
          email,
          name: c.name,
          firstName: c.firstName,
          lastName: c.lastName,
          source: "manual",
          tags: c.tags.length ? c.tags : ["enhancer"],
          status: "active",
          signupDate: c.signupDate,
          unsubscribeToken: crypto.randomUUID(),
        });
        created++;
      }
    }
    return { created, updated };
  },
});

export const backfillNameSplit = mutation({
  args: {},
  handler: async (ctx) => {
    let patched = 0;
    for await (const c of ctx.db.query("contacts")) {
      // Skip if already has firstName
      if (c.firstName) continue;
      const full = (c.name ?? "").trim();
      if (!full) continue;
      const parts = full.split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
      await ctx.db.patch(c._id, { firstName, lastName });
      patched++;
    }
    return { patched };
  },
});

export const ensureUnsubscribeTokens = mutation({
  args: {},
  handler: async (ctx) => {
    let added = 0;
    for await (const c of ctx.db.query("contacts")) {
      if (!c.unsubscribeToken) {
        await ctx.db.patch(c._id, { unsubscribeToken: crypto.randomUUID() });
        added++;
      }
    }
    return { added };
  },
});

export const unsubscribeByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_unsubscribe_token", (q) =>
        q.eq("unsubscribeToken", token),
      )
      .first();
    if (!contact) throw new Error("Invalid unsubscribe link");
    await ctx.db.patch(contact._id, { status: "unsubscribed" });
    return { email: contact.email };
  },
});

export const getActiveContactsForSend = query({
  args: { tags: v.optional(v.array(v.string())) },
  handler: async (ctx, { tags }) => {
    const all = await ctx.db.query("contacts").collect();
    return all
      .filter(
        (c) =>
          c.status === "active" &&
          (!tags || tags.length === 0 || c.tags?.some((t) => tags.includes(t))),
      )
      .map((c) => ({
        _id: c._id,
        email: c.email,
        name: c.name,
        firstName: c.firstName,
        lastName: c.lastName,
        unsubscribeToken: c.unsubscribeToken,
      }));
  },
});

export const getDistinctTags = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("contacts").collect();
    const counts = new Map<string, number>();
    for (const c of all) {
      if (c.status !== "active") continue;
      for (const tag of c.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  },
});

export const countActiveByTags = query({
  args: { tags: v.array(v.string()) },
  handler: async (ctx, { tags }) => {
    const all = await ctx.db.query("contacts").collect();
    return all.filter(
      (c) =>
        c.status === "active" &&
        (tags.length === 0 || c.tags?.some((t) => tags.includes(t))),
    ).length;
  },
});

export const listAllContacts = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("contacts").order("desc").collect();
    return all.map((c) => ({
      _id: c._id,
      email: c.email,
      name: c.name,
      firstName: c.firstName,
      lastName: c.lastName,
      tags: c.tags,
      status: c.status,
      signupDate: c.signupDate,
      source: c.source,
      location: c.location,
    }));
  },
});
