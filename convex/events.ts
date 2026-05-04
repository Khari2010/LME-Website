import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireWrite } from "./auth";

// Helper: events span THREE families (ExternalBooking / InternalShow /
// TeamDiary), each with different write-allowed roles. This dispatches to the
// correct module key based on the event's family.
async function requireWriteForEvent(
  ctx: MutationCtx,
  event: { family: string },
): Promise<void> {
  const mod =
    event.family === "InternalShow"
      ? "internal-shows"
      : event.family === "TeamDiary"
        ? "team-diary"
        : "external-bookings";
  await requireWrite(ctx, mod as never);
}

// ===== Shared validators =====

// Mirrors the `events` table shape declared in convex/schema.ts. Used by
// `getById`, `listByFamily`, and `listForCalendar` so callers get type safety
// on returned documents. As of P4-T7 every sub-block has a structured shape
// (preEventSurvey + discoveryCall remain as v.any() because their shapes are
// enforced at the dedicated mutation layer).
//
// Convex injects `_id` and `_creationTime` into the return type automatically,
// so we don't need to declare them here.
const eventDocValidator = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  // ===== Spine =====
  name: v.string(),
  type: v.union(
    v.literal("Wedding"),
    v.literal("Corporate"),
    v.literal("Festival"),
    v.literal("PrivateParty"),
    v.literal("Other"),
    v.literal("MainShow"),
    v.literal("PopUp"),
    v.literal("ContentShoot"),
    v.literal("Meeting"),
    v.literal("Rehearsal"),
    v.literal("Social"),
  ),
  family: v.union(
    v.literal("ExternalBooking"),
    v.literal("InternalShow"),
    v.literal("TeamDiary"),
  ),
  status: v.string(),
  startDate: v.number(),
  endDate: v.optional(v.number()),
  isAllDay: v.boolean(),
  venue: v.optional(
    v.object({
      name: v.string(),
      address: v.optional(v.string()),
      capacity: v.optional(v.number()),
      contact: v.optional(v.string()),
    }),
  ),
  leadOwner: v.optional(v.id("users")),
  attendees: v.optional(v.array(v.id("users"))),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),
  parentEventId: v.optional(v.id("events")),
  coverImage: v.optional(v.string()),
  nextActionLabel: v.optional(v.string()),
  nextActionDue: v.optional(v.number()),

  // ===== Optional sub-blocks =====
  client: v.optional(
    v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
    }),
  ),
  bookingConfig: v.optional(
    v.object({
      bandConfig: v.string(),
      djRequired: v.boolean(),
      equipmentSource: v.union(
        v.literal("LME"),
        v.literal("Venue"),
        v.literal("Mixed"),
      ),
      extras: v.array(v.string()),
      expectedGuests: v.optional(v.number()),
    }),
  ),
  finance: v.optional(
    v.object({
      fee: v.optional(v.number()),
      deposit: v.optional(
        v.object({
          amount: v.number(),
          paid: v.boolean(),
          paidAt: v.optional(v.number()),
        }),
      ),
      balance: v.optional(
        v.object({
          amount: v.number(),
          dueDate: v.number(),
          paid: v.boolean(),
          paidAt: v.optional(v.number()),
        }),
      ),
      xeroDepositInvoiceRef: v.optional(v.string()),
      xeroBalanceInvoiceRef: v.optional(v.string()),
    }),
  ),
  contract: v.optional(
    v.object({
      templateId: v.optional(v.string()),
      fileUrl: v.optional(v.string()),
      sentAt: v.optional(v.number()),
      signedAt: v.optional(v.number()),
      signedByName: v.optional(v.string()),
      auditLog: v.array(
        v.object({
          ts: v.number(),
          action: v.string(),
          ip: v.optional(v.string()),
        }),
      ),
    }),
  ),
  // Pre-event survey — schema declares as v.any(); enforced at the mutation
  // layer by `convex/preEventSurvey.ts`.
  preEventSurvey: v.optional(v.any()),
  // Discovery call — schema declares as v.any(); enforced at the mutation
  // layer by `convex/discoveryCall.ts`.
  discoveryCall: v.optional(v.any()),
  // P3-T7+T8: structured ticketing block. Mirrors the schema validator.
  ticketing: v.optional(
    v.object({
      platform: v.union(
        v.literal("Eventbrite"),
        v.literal("Skiddle"),
        v.literal("None"),
      ),
      externalEventId: v.optional(v.string()),
      tiers: v.array(
        v.object({
          name: v.string(),
          price: v.number(),
          capacity: v.number(),
          sold: v.number(),
        }),
      ),
      voucherCodes: v.optional(
        v.array(
          v.object({
            code: v.string(),
            discount: v.number(),
            usedCount: v.number(),
            maxUses: v.optional(v.number()),
          }),
        ),
      ),
      lastSyncedAt: v.optional(v.number()),
    }),
  ),
  // P3-T9: sponsorship pipeline. Mirrors the schema validator.
  sponsorship: v.optional(
    v.object({
      activations: v.array(
        v.object({
          brandName: v.string(),
          contact: v.optional(v.string()),
          stage: v.union(
            v.literal("pitched"),
            v.literal("interested"),
            v.literal("confirmed"),
            v.literal("paid"),
            v.literal("declined"),
          ),
          basePackage: v.number(),
          variableCosts: v.optional(v.string()),
        }),
      ),
      cutoffDate: v.optional(v.number()),
    }),
  ),
  afterParty: v.optional(
    v.object({
      venue: v.optional(v.string()),
      host: v.optional(v.string()),
      djLineup: v.array(v.string()),
      sections: v.array(
        v.object({
          name: v.string(),
          durationMins: v.number(),
          genre: v.string(),
        }),
      ),
    }),
  ),
  // P3-T3: structured run-of-show. Mirrors the schema validator.
  // P4-T4: setlistRef added now that the setlists table exists.
  showRun: v.optional(
    v.array(
      v.object({
        order: v.number(),
        name: v.string(),
        durationMins: v.number(),
        setlistRef: v.optional(v.id("setlists")),
        notes: v.optional(v.string()),
        cues: v.optional(v.array(v.string())),
      }),
    ),
  ),
  production: v.optional(
    v.object({
      crew: v.array(
        v.object({
          name: v.string(),
          role: v.string(),
          contact: v.optional(v.string()),
        }),
      ),
      suppliers: v.array(
        v.object({
          name: v.string(),
          service: v.string(),
          cost: v.optional(v.number()),
        }),
      ),
      loadIn: v.optional(v.number()),
      loadOut: v.optional(v.number()),
      riderUrl: v.optional(v.string()),
      decorTeam: v.optional(v.string()),
    }),
  ),
  // P3-T6: structured per-event marketing plan. Mirrors the schema validator.
  marketingPlan: v.optional(
    v.object({
      weeks: v.array(
        v.object({
          weekIndex: v.number(),
          theme: v.string(),
          posts: v.array(
            v.object({
              platform: v.string(),
              copy: v.string(),
              scheduledAt: v.optional(v.number()),
              sent: v.boolean(),
            }),
          ),
        }),
      ),
      eventbriteUrl: v.optional(v.string()),
    }),
  ),
  // P4-T7: structured meeting / rehearsal notes. Mirrors the schema validator.
  meetingDetails: v.optional(
    v.object({
      attendees: v.array(v.string()),
      transcript: v.optional(v.string()),
      decisions: v.array(v.string()),
      actions: v.array(
        v.object({
          description: v.string(),
          assignee: v.optional(v.string()),
          done: v.boolean(),
        }),
      ),
    }),
  ),
});

// Structured shapes reused by `create` so its arg validators mirror the schema.
const clientArgValidator = v.object({
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
});

const bookingConfigArgValidator = v.object({
  bandConfig: v.string(),
  djRequired: v.boolean(),
  equipmentSource: v.union(
    v.literal("LME"),
    v.literal("Venue"),
    v.literal("Mixed"),
  ),
  extras: v.array(v.string()),
  expectedGuests: v.optional(v.number()),
});

const financeArgValidator = v.object({
  fee: v.optional(v.number()),
  deposit: v.optional(
    v.object({
      amount: v.number(),
      paid: v.boolean(),
      paidAt: v.optional(v.number()),
    }),
  ),
  balance: v.optional(
    v.object({
      amount: v.number(),
      dueDate: v.number(),
      paid: v.boolean(),
      paidAt: v.optional(v.number()),
    }),
  ),
  xeroDepositInvoiceRef: v.optional(v.string()),
  xeroBalanceInvoiceRef: v.optional(v.string()),
});

const contractArgValidator = v.object({
  templateId: v.optional(v.string()),
  fileUrl: v.optional(v.string()),
  sentAt: v.optional(v.number()),
  signedAt: v.optional(v.number()),
  signedByName: v.optional(v.string()),
  auditLog: v.array(
    v.object({
      ts: v.number(),
      action: v.string(),
      ip: v.optional(v.string()),
    }),
  ),
});

// P3-T7+T8: ticketing arg validator — used by `create` (so a fresh event can
// be seeded with a ticketing block, e.g. by tests) and `setTicketing`.
const ticketingArgValidator = v.object({
  platform: v.union(
    v.literal("Eventbrite"),
    v.literal("Skiddle"),
    v.literal("None"),
  ),
  externalEventId: v.optional(v.string()),
  tiers: v.array(
    v.object({
      name: v.string(),
      price: v.number(),
      capacity: v.number(),
      sold: v.number(),
    }),
  ),
  voucherCodes: v.optional(
    v.array(
      v.object({
        code: v.string(),
        discount: v.number(),
        usedCount: v.number(),
        maxUses: v.optional(v.number()),
      }),
    ),
  ),
  lastSyncedAt: v.optional(v.number()),
});

// P3-T9: sponsorship arg validator.
const sponsorshipArgValidator = v.object({
  activations: v.array(
    v.object({
      brandName: v.string(),
      contact: v.optional(v.string()),
      stage: v.union(
        v.literal("pitched"),
        v.literal("interested"),
        v.literal("confirmed"),
        v.literal("paid"),
        v.literal("declined"),
      ),
      basePackage: v.number(),
      variableCosts: v.optional(v.string()),
    }),
  ),
  cutoffDate: v.optional(v.number()),
});

// ===== Mutations + queries =====

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("Wedding"),
      v.literal("Corporate"),
      v.literal("Festival"),
      v.literal("PrivateParty"),
      v.literal("Other"),
      v.literal("MainShow"),
      v.literal("PopUp"),
      v.literal("ContentShoot"),
      v.literal("Meeting"),
      v.literal("Rehearsal"),
      v.literal("Social"),
    ),
    family: v.union(
      v.literal("ExternalBooking"),
      v.literal("InternalShow"),
      v.literal("TeamDiary"),
    ),
    status: v.string(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    isAllDay: v.boolean(),
    venue: v.optional(
      v.object({
        name: v.string(),
        address: v.optional(v.string()),
        capacity: v.optional(v.number()),
        contact: v.optional(v.string()),
      }),
    ),
    leadOwner: v.optional(v.id("users")),
    attendees: v.optional(v.array(v.id("users"))),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    nextActionLabel: v.optional(v.string()),
    nextActionDue: v.optional(v.number()),
    client: v.optional(clientArgValidator),
    bookingConfig: v.optional(bookingConfigArgValidator),
    finance: v.optional(financeArgValidator),
    contract: v.optional(contractArgValidator),
    ticketing: v.optional(ticketingArgValidator),
    sponsorship: v.optional(sponsorshipArgValidator),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const mod =
      args.family === "InternalShow"
        ? "internal-shows"
        : args.family === "TeamDiary"
          ? "team-diary"
          : "external-bookings";
    await requireWrite(ctx, mod as never);
    return await ctx.db.insert("events", args);
  },
});

export const getById = query({
  args: { id: v.id("events") },
  returns: v.union(v.null(), eventDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByFamily = query({
  args: {
    family: v.union(
      v.literal("ExternalBooking"),
      v.literal("InternalShow"),
      v.literal("TeamDiary"),
    ),
  },
  returns: v.array(eventDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_family_and_date", (q) => q.eq("family", args.family))
      .order("asc")
      .collect();
  },
});

export const setStatus = mutation({
  args: { id: v.id("events"), status: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    await requireWriteForEvent(ctx, event);
    await ctx.db.patch(args.id, { status: args.status });
    return null;
  },
});

export const listForCalendar = query({
  args: { from: v.number(), to: v.number() },
  returns: v.array(eventDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), args.from),
          q.lt(q.field("startDate"), args.to),
        ),
      )
      .collect();
  },
});

// P3-T3: replace the entire run-of-show array. Simpler than item-level CRUD
// for the MVP — the UI sends the full ordered list on save, and we sort by
// `order` here to enforce the contract regardless of what the client sends.
export const setShowRun = mutation({
  args: {
    id: v.id("events"),
    items: v.array(
      v.object({
        order: v.number(),
        name: v.string(),
        durationMins: v.number(),
        setlistRef: v.optional(v.id("setlists")),
        notes: v.optional(v.string()),
        cues: v.optional(v.array(v.string())),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    await requireWriteForEvent(ctx, event);
    const sorted = [...args.items].sort((a, b) => a.order - b.order);
    await ctx.db.patch(args.id, { showRun: sorted });
    return null;
  },
});

// P3-T4: replace the entire production sub-block. Same approach as setShowRun
// — UI sends the full object on save; we patch in one shot.
export const setProduction = mutation({
  args: {
    id: v.id("events"),
    production: v.object({
      crew: v.array(
        v.object({
          name: v.string(),
          role: v.string(),
          contact: v.optional(v.string()),
        }),
      ),
      suppliers: v.array(
        v.object({
          name: v.string(),
          service: v.string(),
          cost: v.optional(v.number()),
        }),
      ),
      loadIn: v.optional(v.number()),
      loadOut: v.optional(v.number()),
      riderUrl: v.optional(v.string()),
      decorTeam: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    await requireWriteForEvent(ctx, event);
    await ctx.db.patch(args.id, { production: args.production });
    return null;
  },
});

// P3-T5: replace the entire afterParty sub-block. MainShow-only at the UI
// layer — enforcement at the mutation layer is intentionally lenient so we
// don't have to thread event-type checks through every save.
export const setAfterParty = mutation({
  args: {
    id: v.id("events"),
    afterParty: v.object({
      venue: v.optional(v.string()),
      host: v.optional(v.string()),
      djLineup: v.array(v.string()),
      sections: v.array(
        v.object({
          name: v.string(),
          durationMins: v.number(),
          genre: v.string(),
        }),
      ),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    await requireWriteForEvent(ctx, event);
    await ctx.db.patch(args.id, { afterParty: args.afterParty });
    return null;
  },
});

// P3-T6: replace the entire marketingPlan sub-block. Same approach as
// setShowRun / setProduction / setAfterParty — UI sends the full plan on save;
// we sort the weeks by weekIndex so downstream consumers (Content Planner)
// can rely on chronological order regardless of what the client sent.
export const setMarketingPlan = mutation({
  args: {
    id: v.id("events"),
    plan: v.object({
      weeks: v.array(
        v.object({
          weekIndex: v.number(),
          theme: v.string(),
          posts: v.array(
            v.object({
              platform: v.string(),
              copy: v.string(),
              scheduledAt: v.optional(v.number()),
              sent: v.boolean(),
            }),
          ),
        }),
      ),
      eventbriteUrl: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    await requireWriteForEvent(ctx, event);
    const sorted = {
      ...args.plan,
      weeks: [...args.plan.weeks].sort((a, b) => a.weekIndex - b.weekIndex),
    };
    await ctx.db.patch(args.id, { marketingPlan: sorted });
    return null;
  },
});

// P3-T7+T8: replace the entire ticketing sub-block. UI sends platform,
// external event ID, ticket tiers, and voucher codes in one shot.
export const setTicketing = mutation({
  args: {
    id: v.id("events"),
    ticketing: ticketingArgValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    await requireWriteForEvent(ctx, event);
    await ctx.db.patch(args.id, { ticketing: args.ticketing });
    return null;
  },
});

// P3-T9: replace the entire sponsorship sub-block.
export const setSponsorship = mutation({
  args: {
    id: v.id("events"),
    sponsorship: sponsorshipArgValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    await requireWriteForEvent(ctx, event);
    await ctx.db.patch(args.id, { sponsorship: args.sponsorship });
    return null;
  },
});

// P3-T7: schedule the Eventbrite sync action. Public mutation wrapper because
// `convex/eventbrite.ts` is a Node-runtime file (`"use node"`) and cannot be
// called directly from a client-side `useMutation`. Validates that the event
// has an externalEventId set first — the action would otherwise short-circuit
// without a useful error.
export const triggerTicketingSync = mutation({
  args: { id: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event?.ticketing?.externalEventId) {
      throw new Error("Set externalEventId before syncing");
    }
    await requireWriteForEvent(ctx, event);
    await ctx.scheduler.runAfter(0, internal.eventbrite.syncSales, {
      eventId: args.id,
      externalEventId: event.ticketing.externalEventId,
    });
    return null;
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    // For nested objects in the patch, we use v.any() — patches are partial,
    // and validating partial shapes with v.object is awkward. The DB-level
    // schema validator catches bad writes regardless.
    patch: v.object({
      name: v.optional(v.string()),
      status: v.optional(v.string()),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      isAllDay: v.optional(v.boolean()),
      venue: v.optional(v.any()),
      leadOwner: v.optional(v.id("users")),
      attendees: v.optional(v.array(v.id("users"))),
      description: v.optional(v.string()),
      notes: v.optional(v.string()),
      nextActionLabel: v.optional(v.string()),
      nextActionDue: v.optional(v.number()),
      client: v.optional(v.any()),
      bookingConfig: v.optional(v.any()),
      finance: v.optional(v.any()),
      preEventSurvey: v.optional(v.any()),
      discoveryCall: v.optional(v.any()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    await requireWriteForEvent(ctx, event);
    await ctx.db.patch(args.id, args.patch);
    return null;
  },
});
