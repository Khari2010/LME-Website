import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { requireAuth, requireWrite } from "./auth";
import { rateLimit } from "./rateLimit";

// NOTE: This must match MAGIC_LINK_TTL_MS in src/lib/enhancers/tokens.ts.
// Convex functions can't easily import from src/, so we duplicate the constant
// here. If you change one, change both.
const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  return crypto.randomUUID();
}

export const signupOrLogin = mutation({
  args: { email: v.string(), firstName: v.optional(v.string()) },
  handler: async (ctx, { email, firstName }) => {
    const normalised = email.trim().toLowerCase();
    if (!normalised.includes("@")) {
      throw new Error("Invalid email");
    }
    const trimmedFirstName = firstName?.trim() || undefined;

    // Public + unauthenticated — cap signup/login attempts at 5/hour per
    // email so an attacker can't hammer this endpoint with magic-link sends.
    // Test bypass via VITEST/NODE_ENV.
    await rateLimit(ctx, `signup:${normalised}`, 5);

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
        firstName: trimmedFirstName,
        name: trimmedFirstName,
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
        ...(trimmedFirstName && !existing.firstName ? { firstName: trimmedFirstName, name: existing.name ?? trimmedFirstName } : {}),
      });
    }

    // Schedule the welcome email (delivered by convex/emails.ts).
    await ctx.scheduler.runAfter(0, internal.emails.sendEnhancerWelcomeEmail, {
      contactId,
      token,
      isNewSignup,
    });

    // P2-T4: enrol new signups in the default welcome series. `enrollContact`
    // is idempotent (no-op for existing enrollments) so safe to call on
    // every login — the existing-contact branch above will just be a no-op
    // on the enrollment side.
    if (isNewSignup) {
      await ctx.scheduler.runAfter(0, internal.welcomeSeries.enrollContact, {
        contactId,
      });
    }

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
    await requireAuth(ctx);
    return await ctx.db.get(id);
  },
});

// Internal-only twin for actions (e.g. emails.sendEnhancerWelcomeEmail,
// welcomeSeriesAction) that fire from schedulers without a Clerk identity.
export const getContactByIdInternal = internalQuery({
  args: { id: v.id("contacts") },
  handler: async (ctx, { id }): Promise<Doc<"contacts"> | null> => {
    return await ctx.db.get(id);
  },
});

export const getEnhancersDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
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
    await requireAuth(ctx);
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

export const addManualContact = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, { email, firstName, lastName, tags }) => {
    await requireWrite(ctx, "marketing");
    const normalised = email.trim().toLowerCase();
    if (!normalised.includes("@")) {
      throw new Error("Invalid email address");
    }
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", normalised))
      .first();
    if (existing) {
      // Re-activate if previously unsubscribed; merge tags.
      await ctx.db.patch(existing._id, {
        status: "active",
        firstName: firstName ?? existing.firstName,
        lastName: lastName ?? existing.lastName,
        name: [firstName, lastName].filter(Boolean).join(" ") || existing.name,
        tags: Array.from(new Set([...(existing.tags ?? []), ...tags])),
      });
      return { id: existing._id, created: false };
    }
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || undefined;
    const id = await ctx.db.insert("contacts", {
      email: normalised,
      name: fullName,
      firstName,
      lastName,
      source: "manual",
      tags: tags.length > 0 ? tags : ["manual"],
      status: "active",
      signupDate: Date.now(),
      unsubscribeToken: crypto.randomUUID(),
    });
    return { id, created: true };
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
    await requireWrite(ctx, "marketing");
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
    // P2-T4: cancel any active welcome-series enrollments so the drip stops.
    await ctx.scheduler.runAfter(0, internal.welcomeSeries.cancelForContact, {
      contactId: contact._id,
    });
    return { email: contact.email };
  },
});

// Shared handler so both the public + internal versions return the same shape.
// `getActiveContactsForSend` is called from admin UI (Composer) AND from
// scheduled actions (campaignSender). Public version requires auth; internal
// version is callable from cron-driven actions where there's no Clerk identity.
async function getActiveContactsForSendImpl(
  ctx: import("./_generated/server").QueryCtx,
  { tags }: { tags?: string[] },
) {
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
}

export const getActiveContactsForSend = query({
  args: { tags: v.optional(v.array(v.string())) },
  handler: async (ctx, { tags }) => {
    await requireAuth(ctx);
    return await getActiveContactsForSendImpl(ctx, { tags });
  },
});

// Internal-only twin for actions that have no Clerk identity (e.g. cron-driven
// sends). Convex action `runQuery` doesn't surface auth, so guarded queries
// would always reject. Internal queries can only be invoked server-side.
export const getActiveContactsForSendInternal = internalQuery({
  args: { tags: v.optional(v.array(v.string())) },
  handler: async (ctx, { tags }) => {
    return await getActiveContactsForSendImpl(ctx, { tags });
  },
});

export const getDistinctTags = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
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
    await requireAuth(ctx);
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
    await requireAuth(ctx);
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

// ===== P2-T2: hard-bounce + complaint auto-suppression =====
//
// Called from `convex/campaigns.recordCampaignEvent` when the Resend webhook
// reports a hard bounce or spam complaint. We flip the offending contact's
// status so future campaigns automatically skip them, protecting our sender
// reputation. Both mutations are idempotent — safe to invoke twice for the
// same event without double-stamping the audit note.

export const markBouncedByEmail = internalMutation({
  args: { email: v.string(), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();
    if (!contact) return null;
    if (contact.status === "bounced") return null; // idempotent
    const noteAddition = `[Auto-suppressed: hard bounce${args.reason ? " — " + args.reason : ""} on ${new Date().toISOString().slice(0, 10)}]`;
    const newNotes = contact.notes
      ? `${contact.notes}\n${noteAddition}`
      : noteAddition;
    await ctx.db.patch(contact._id, { status: "bounced", notes: newNotes });
    // P2-T4: cancel any active welcome-series enrollments — bounced contacts
    // shouldn't keep receiving drip emails.
    await ctx.scheduler.runAfter(0, internal.welcomeSeries.cancelForContact, {
      contactId: contact._id,
    });
    return null;
  },
});

export const markComplainedByEmail = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();
    if (!contact) return null;
    if (contact.status === "unsubscribed") return null; // idempotent
    const noteAddition = `[Auto-suppressed: spam complaint on ${new Date().toISOString().slice(0, 10)}]`;
    const newNotes = contact.notes
      ? `${contact.notes}\n${noteAddition}`
      : noteAddition;
    await ctx.db.patch(contact._id, {
      status: "unsubscribed",
      notes: newNotes,
    });
    // P2-T4: cancel any active welcome-series enrollments.
    await ctx.scheduler.runAfter(0, internal.welcomeSeries.cancelForContact, {
      contactId: contact._id,
    });
    return null;
  },
});
