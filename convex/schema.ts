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
    // P3-T7+T8: structured ticketing block — platform, external event ID,
    // tier list (name/price/capacity/sold), and embedded voucher codes.
    ticketing: v.optional(v.object({
      platform: v.union(
        v.literal("Eventbrite"),
        v.literal("Skiddle"),
        v.literal("None"),
      ),
      externalEventId: v.optional(v.string()),
      tiers: v.array(v.object({
        name: v.string(),
        price: v.number(),
        capacity: v.number(),
        sold: v.number(),
      })),
      voucherCodes: v.optional(v.array(v.object({
        code: v.string(),
        discount: v.number(), // percentage (0-100)
        usedCount: v.number(),
        maxUses: v.optional(v.number()),
      }))),
      lastSyncedAt: v.optional(v.number()),
    })),
    // P3-T9: sponsorship pipeline — list of brand activations with stage,
    // package fee, and optional cutoff date for the show.
    sponsorship: v.optional(v.object({
      activations: v.array(v.object({
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
      })),
      cutoffDate: v.optional(v.number()),
    })),
    afterParty: v.optional(v.object({
      venue: v.optional(v.string()),
      host: v.optional(v.string()),
      djLineup: v.array(v.string()),
      sections: v.array(v.object({ name: v.string(), durationMins: v.number(), genre: v.string() })),
    })),
    // P3-T3: structured run-of-show. Items in display order; the `order`
    // field is canonical (the `setShowRun` mutation sorts by it before
    // patching). `setlistRef` will be added in Phase 4 once the `setlists`
    // table exists.
    showRun: v.optional(v.array(v.object({
      order: v.number(),
      name: v.string(),
      durationMins: v.number(),
      setlistRef: v.optional(v.id("setlists")),
      notes: v.optional(v.string()),
      cues: v.optional(v.array(v.string())),
    }))),
    production: v.optional(v.object({
      crew: v.array(v.object({ name: v.string(), role: v.string(), contact: v.optional(v.string()) })),
      suppliers: v.array(v.object({ name: v.string(), service: v.string(), cost: v.optional(v.number()) })),
      loadIn: v.optional(v.number()),
      loadOut: v.optional(v.number()),
      riderUrl: v.optional(v.string()),
      decorTeam: v.optional(v.string()),
    })),
    // P3-T6: structured per-event marketing plan. Phased weekly campaign
    // authored on the per-event Marketing tab. The Phase-2 Content Planner
    // already reads this data structure to render upcoming posts.
    marketingPlan: v.optional(v.object({
      weeks: v.array(v.object({
        weekIndex: v.number(),
        theme: v.string(),
        posts: v.array(v.object({
          platform: v.string(), // "Instagram" | "TikTok" | "Email" | etc.
          copy: v.string(),
          scheduledAt: v.optional(v.number()),
          sent: v.boolean(),
        })),
      })),
      eventbriteUrl: v.optional(v.string()),
    })),
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

  // ===== P2-T4: Welcome series (drip campaigns) =====
  //
  // Two-table design — `welcomeSeriesSteps` holds the per-series template rows
  // (admin-editable subject + bodyHtml + delayDays); `welcomeSeriesEnrollments`
  // tracks each contact's progress through a series. The hourly cron in
  // `convex/welcomeSeriesAction.ts` walks enrollments where
  // `nextStepDueAt <= now`, fires the step's email via Resend, and advances
  // the enrollment to the next step (or marks it complete).

  welcomeSeriesSteps: defineTable({
    seriesKey: v.string(), // e.g. "enhancers-default" — supports multiple series later
    stepIndex: v.number(), // 0, 1, 2 …
    delayDays: v.number(), // days from previous step (or signup, for step 0)
    subject: v.string(),
    bodyHtml: v.string(),
    active: v.boolean(), // turn off without deleting
  })
    .index("by_series_and_step", ["seriesKey", "stepIndex"])
    .index("by_series_active", ["seriesKey", "active"]),

  welcomeSeriesEnrollments: defineTable({
    contactId: v.id("contacts"),
    seriesKey: v.string(),
    enrolledAt: v.number(),
    nextStepDueAt: v.number(), // when the next step should fire
    nextStepIndex: v.number(), // which step is next (0, 1, 2, …)
    completedAt: v.optional(v.number()), // set when no more active steps
    cancelledAt: v.optional(v.number()), // set if contact unsubscribes / bounces
  })
    .index("by_contact_and_series", ["contactId", "seriesKey"])
    .index("by_due_and_active", ["nextStepDueAt"]),

  // ===== P4-T1: Songs catalogue =====
  //
  // Central catalogue of all songs the band performs — each row stores the
  // song's title plus its working metadata (key, BPM, lead vocalist, genres,
  // demo links). Used by setlists (P4-T2/T3) and demos (P4-T5).
  songs: defineTable({
    title: v.string(),
    artist: v.optional(v.string()),
    songKey: v.optional(v.string()), // "C major", "G♭", etc.
    bpm: v.optional(v.number()),
    lead: v.optional(v.string()), // free-text lead vocalist
    genres: v.array(v.string()),
    demoLinks: v.array(v.string()), // SoundCloud / YouTube URLs
    notes: v.optional(v.string()),
    archived: v.boolean(), // soft-delete
  })
    .index("by_archived_and_title", ["archived", "title"]),

  // ===== P4-T2/T3: Setlists =====
  //
  // An ordered collection of songs (from `songs`) with a free-form purpose
  // ("Wedding default", "Festival 90-min", "Pop-up tease"). Items carry their
  // own `order` (canonical sort key, renumbered 0..n-1 by `setItems`) plus
  // optional inline notes ("acoustic intro", "skip last chorus").
  setlists: defineTable({
    name: v.string(),
    purpose: v.optional(v.string()),
    items: v.array(v.object({
      order: v.number(),
      songId: v.id("songs"),
      notes: v.optional(v.string()),
    })),
  })
    .index("by_name", ["name"]),
});
