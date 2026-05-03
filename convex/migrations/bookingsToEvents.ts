import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Notion BOOKINGS → Convex `events` migration
//
// One-shot internal mutation called by `scripts/migrate-bookings.ts`. Takes a
// single booking row pulled from the Notion BOOKINGS database (already mapped
// to a flat shape by the runner) and inserts it as an `events` row with
// `family: "ExternalBooking"`.
//
// Run via: `pnpm migrate:bookings` (see scripts/migrate-bookings.ts).
// ---------------------------------------------------------------------------

const eventTypeMap: Record<
  string,
  "Wedding" | "Corporate" | "Festival" | "PrivateParty" | "Other"
> = {
  Wedding: "Wedding",
  Corporate: "Corporate",
  Festival: "Festival",
  "Private Party": "PrivateParty",
  Other: "Other",
};

// Notion BOOKINGS uses a richer set of statuses than Phase-1a Convex events.
// Map the relevant ones onto the Phase-1a status set; anything unknown
// falls back to "Inquiry".
const statusMap: Record<string, string> = {
  Enquiry: "Inquiry",
  Quoted: "Quoting",
  "Contract Sent": "ContractSent",
  "Deposit Paid": "Booked",
  Booked: "Booked",
  Completed: "Completed",
  Cancelled: "Cancelled",
};

export const importOne = internalMutation({
  args: {
    notion: v.object({
      bookingName: v.string(),
      clientName: v.optional(v.string()),
      clientEmail: v.optional(v.string()),
      clientPhone: v.optional(v.string()),
      eventType: v.optional(v.string()),
      eventDate: v.optional(v.number()),
      venue: v.optional(v.string()),
      expectedGuests: v.optional(v.number()),
      genres: v.array(v.string()),
      djRequired: v.boolean(),
      status: v.optional(v.string()),
      fee: v.optional(v.number()),
      depositPaid: v.boolean(),
      notes: v.optional(v.string()),
    }),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const n = args.notion;
    const type = eventTypeMap[n.eventType ?? "Other"] ?? "Other";
    const status = statusMap[n.status ?? "Enquiry"] ?? "Inquiry";

    return await ctx.db.insert("events", {
      name: n.bookingName,
      type,
      family: "ExternalBooking",
      status,
      startDate: n.eventDate ?? Date.now(),
      isAllDay: true,
      venue: n.venue ? { name: n.venue } : undefined,
      notes: n.notes,
      client:
        n.clientName || n.clientEmail
          ? {
              name: n.clientName ?? "",
              email: n.clientEmail ?? "",
              phone: n.clientPhone,
            }
          : undefined,
      bookingConfig: {
        bandConfig: "TBD",
        djRequired: n.djRequired,
        equipmentSource: "LME",
        extras: [],
        expectedGuests: n.expectedGuests,
      },
      finance:
        n.fee != null
          ? {
              fee: n.fee,
              deposit: n.depositPaid
                ? { amount: n.fee * 0.5, paid: true }
                : undefined,
            }
          : undefined,
    });
  },
});
