import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("Wedding"), v.literal("Corporate"), v.literal("Festival"),
      v.literal("PrivateParty"), v.literal("Other"),
      v.literal("MainShow"), v.literal("PopUp"),
      v.literal("ContentShoot"), v.literal("Meeting"),
      v.literal("Rehearsal"), v.literal("Social"),
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
    venue: v.optional(v.object({
      name: v.string(),
      address: v.optional(v.string()),
      capacity: v.optional(v.number()),
      contact: v.optional(v.string()),
    })),
    leadOwner: v.optional(v.id("users")),
    attendees: v.optional(v.array(v.id("users"))),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    nextActionLabel: v.optional(v.string()),
    nextActionDue: v.optional(v.number()),
    client: v.optional(v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
    })),
    bookingConfig: v.optional(v.any()),
    finance: v.optional(v.any()),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", args);
  },
});

export const getById = query({
  args: { id: v.id("events") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
