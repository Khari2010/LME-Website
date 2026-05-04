import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ===== Active in #1a =====

  contacts: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    source: v.union(
      v.literal("enhancers-signup"),
      v.literal("booking-inquiry"),
      v.literal("manual"),
    ),
    tags: v.array(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("unsubscribed"),
      v.literal("bounced"),
    ),
    signupDate: v.number(),
    lastActive: v.optional(v.number()),
    magicLinkToken: v.optional(v.string()),
    magicLinkIssuedAt: v.optional(v.number()),
    ageRange: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    unsubscribeToken: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_magic_token", ["magicLinkToken"])
    .index("by_unsubscribe_token", ["unsubscribeToken"]),

  posts: defineTable({
    title: v.string(),
    slug: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    type: v.union(
      v.literal("post"),
      v.literal("mix"),
      v.literal("listen-link"),
      v.literal("feedback-request"),
    ),
    featured: v.boolean(),
    publishedDate: v.optional(v.number()),
    heroImageUrl: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    bodyHtml: v.string(),
    embedUrls: v.array(v.string()),
    campaignId: v.optional(v.id("campaigns")),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_date", ["status", "publishedDate"]),

  // ===== Reserved — populated in later sub-projects =====

  campaigns: defineTable({
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sent"),
    ),
    subjectLine: v.string(),
    preheader: v.optional(v.string()),
    bodyHtml: v.string(),
    sentDate: v.optional(v.number()),
    sentBy: v.optional(v.string()),
    recipientCount: v.optional(v.number()),
    recipientTags: v.optional(v.array(v.string())),
    resendMessageId: v.optional(v.string()),
    // All Resend message IDs returned by batch.send for this campaign. Used to
    // map incoming webhook events back to the campaign that triggered them.
    resendBatchIds: v.optional(v.array(v.string())),
    linkedPostId: v.optional(v.id("posts")),
    // P2-T1: when status === "scheduled", the wall-clock ms timestamp at which
    // the cron should fire the send. Cleared (set undefined) if the schedule
    // is cancelled (status flips back to "draft").
    scheduledAt: v.optional(v.number()),
  }).index("by_status_and_date", ["status", "sentDate"]),

  campaignEvents: defineTable({
    campaignId: v.id("campaigns"),
    resendMessageId: v.string(),
    recipientEmail: v.string(),
    type: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("complained"),
      v.literal("delivery_delayed"),
    ),
    occurredAt: v.number(),
    data: v.optional(v.any()),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_message_id", ["resendMessageId"]),

  assets: defineTable({
    type: v.union(v.literal("photo"), v.literal("audio"), v.literal("video")),
    dropboxPath: v.optional(v.string()),
    cdnUrl: v.string(),
    caption: v.optional(v.string()),
    tags: v.array(v.string()),
    event: v.optional(v.string()),
    date: v.optional(v.number()),
    externalUrl: v.optional(v.string()),
  }),

  events: defineTable({
    // ===== Spine =====
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
    parentEventId: v.optional(v.id("events")),
    coverImage: v.optional(v.string()),
    nextActionLabel: v.optional(v.string()),
    nextActionDue: v.optional(v.number()),

    // ===== Optional sub-blocks =====
    client: v.optional(v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
    })),
    bookingConfig: v.optional(v.object({
      bandConfig: v.string(),
      djRequired: v.boolean(),
      equipmentSource: v.union(v.literal("LME"), v.literal("Venue"), v.literal("Mixed")),
      extras: v.array(v.string()),
      expectedGuests: v.optional(v.number()),
    })),
    finance: v.optional(v.object({
      fee: v.optional(v.number()),
      deposit: v.optional(v.object({ amount: v.number(), paid: v.boolean(), paidAt: v.optional(v.number()) })),
      balance: v.optional(v.object({ amount: v.number(), dueDate: v.number(), paid: v.boolean(), paidAt: v.optional(v.number()) })),
      xeroDepositInvoiceRef: v.optional(v.string()),
      xeroBalanceInvoiceRef: v.optional(v.string()),
    })),
    contract: v.optional(v.object({
      templateId: v.optional(v.string()),
      fileUrl: v.optional(v.string()),
      sentAt: v.optional(v.number()),
      signedAt: v.optional(v.number()),
      signedByName: v.optional(v.string()),
      auditLog: v.array(v.object({ ts: v.number(), action: v.string(), ip: v.optional(v.string()) })),
    })),
    // Pre-event survey — populated when the admin sends the "final details"
    // magic link and again when the client submits genres / must-plays /
    // day-of contact. Stored as v.any() (matching the reserved-block pattern
    // below) so the mutation layer is the only enforcement point. Structured
    // contents: { requestedAt?, submittedAt?, genrePreferences?, mustPlays?,
    // doNotPlays?, finalStartTime?, finalEndTime?, dayOfContactName?,
    // dayOfContactPhone?, notes? }.
    preEventSurvey: v.optional(v.any()),
    // Discovery call slot booking — populated when the admin proposes 3-5
    // slots after `FormReturned`, and again when the client picks one. Same
    // v.any() pattern as preEventSurvey — mutation layer enforces shape.
    // Structured contents: { proposedSlots: number[], proposedAt?,
    // pickedSlot?, pickedAt?, cancelledAt? }.
    discoveryCall: v.optional(v.any()),
    // (Phase 1b/3+ blocks — schema reserved with v.any() but UI not yet rendering)
    ticketing: v.optional(v.any()),
    sponsorship: v.optional(v.any()),
    afterParty: v.optional(v.any()),
    showRun: v.optional(v.any()),
    production: v.optional(v.any()),
    marketingPlan: v.optional(v.any()),
    meetingDetails: v.optional(v.any()),
  })
    .index("by_family_and_date", ["family", "startDate"])
    .index("by_type_and_date", ["type", "startDate"])
    .index("by_status", ["status"])
    .index("by_lead_owner", ["leadOwner"]),

  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.union(
      v.literal("director"),
      v.literal("admin"),
      v.literal("internal-events"),
      v.literal("marketing"),
      v.literal("production"),
      v.literal("ticketing"),
      // Legacy values retained during migration so existing rows validate.
      v.literal("owner"),
      v.literal("drafter"),
    ),
    joinedAt: v.number(),
    lastSignInAt: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkUserId"])
    .index("by_email", ["email"]),

  invitations: defineTable({
    email: v.string(),
    firstName: v.optional(v.string()),
    clerkInvitationId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked"),
      v.literal("expired"),
    ),
    invitedBy: v.string(),
    invitedAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkInvitationId"])
    .index("by_status", ["status"]),

  // Magic-link tokens for the client-facing booking portal. Issued per event
  // so that revoking access for one booking only affects that booking. Stored
  // in Convex (instead of as JWT-style cookies) so we can revoke, expire, and
  // audit them server-side. See `convex/bookingTokens.ts`.
  bookingTokens: defineTable({
    eventId: v.id("events"),
    token: v.string(), // random URL-safe ~32 chars
    mintedAt: v.number(),
    expiresAt: v.number(), // mintedAt + 6 months by default
    revokedAt: v.optional(v.number()),
    // Optional: scope what the token unlocks. Empty/undefined = full
    // client-portal access.
    scopes: v.optional(v.array(v.string())),
  })
    .index("by_token", ["token"])
    .index("by_event", ["eventId"]),
});
