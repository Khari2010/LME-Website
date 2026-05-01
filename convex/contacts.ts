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
