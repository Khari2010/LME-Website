import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ===== Shared validators =====

// Mirrors the `events` table shape declared in convex/schema.ts. Used by
// `getById`, `listByFamily`, and `listForCalendar` so callers get type safety
// on returned documents. The reserved Phase-1b/3+ sub-blocks (ticketing,
// sponsorship, afterParty, showRun, production, marketingPlan, meetingDetails)
// stay as v.any() because the schema itself reserves them as v.any() — their
// shapes are not yet pinned down.
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
  // Reserved Phase-1b/3+ sub-blocks — schema declares these as v.any().
  ticketing: v.optional(v.any()),
  sponsorship: v.optional(v.any()),
  afterParty: v.optional(v.any()),
  showRun: v.optional(v.any()),
  production: v.optional(v.any()),
  marketingPlan: v.optional(v.any()),
  meetingDetails: v.optional(v.any()),
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
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
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
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.patch);
    return null;
  },
});
