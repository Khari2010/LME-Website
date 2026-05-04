import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const eventTypeValidator = v.union(
  v.literal("Wedding"),
  v.literal("Corporate"),
  v.literal("Festival"),
  v.literal("PrivateParty"),
  v.literal("Other"),
);

export const submitInquiry = mutation({
  args: {
    clientName: v.string(),
    clientEmail: v.string(),
    clientPhone: v.optional(v.string()),
    eventType: eventTypeValidator,
    eventDate: v.number(),
    venue: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    expectedGuests: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  returns: v.object({ eventId: v.id("events") }),
  handler: async (ctx, args) => {
    if (!args.clientName.trim()) throw new Error("clientName required");
    if (!args.clientEmail.trim()) throw new Error("clientEmail required");

    const eventId = await ctx.db.insert("events", {
      name: `${args.eventType} — ${args.clientName}`,
      type: args.eventType,
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: args.eventDate,
      isAllDay: true,
      venue: args.venue
        ? { name: args.venue, address: args.venueAddress }
        : undefined,
      description: args.description,
      client: {
        name: args.clientName,
        email: args.clientEmail,
        phone: args.clientPhone,
      },
      bookingConfig: args.expectedGuests
        ? {
            bandConfig: "TBD",
            djRequired: false,
            equipmentSource: "LME",
            extras: [],
            expectedGuests: args.expectedGuests,
          }
        : undefined,
      nextActionLabel: "Initial review (Chris/Tanisha)",
    });

    // Schedule the confirmation email asynchronously — keeps the mutation fast
    // and lets the action handle Resend (Node runtime).
    await ctx.scheduler.runAfter(
      0,
      internal.publicInquiryEmail.sendConfirmationEmail,
      {
        eventId,
        clientEmail: args.clientEmail,
        clientName: args.clientName,
      },
    );

    return { eventId };
  },
});
