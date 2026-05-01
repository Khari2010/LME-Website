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
    status: v.union(v.literal("draft"), v.literal("sent")),
    subjectLine: v.string(),
    preheader: v.optional(v.string()),
    bodyHtml: v.string(),
    sentDate: v.optional(v.number()),
    sentBy: v.optional(v.string()),
    recipientCount: v.optional(v.number()),
    recipientTags: v.optional(v.array(v.string())),
    resendMessageId: v.optional(v.string()),
    linkedPostId: v.optional(v.id("posts")),
  }).index("by_status_and_date", ["status", "sentDate"]),

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

  bookings: defineTable({
    clientName: v.string(),
    clientEmail: v.string(),
    clientPhone: v.optional(v.string()),
    eventType: v.union(
      v.literal("wedding"),
      v.literal("corporate"),
      v.literal("private-party"),
      v.literal("festival"),
      v.literal("other"),
    ),
    eventDate: v.number(),
    venue: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    expectedGuests: v.optional(v.number()),
    genres: v.array(v.string()),
    djRequired: v.boolean(),
    status: v.union(
      v.literal("enquiry"),
      v.literal("quoted"),
      v.literal("contract-sent"),
      v.literal("deposit-paid"),
      v.literal("booked"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    fee: v.optional(v.number()),
    depositPaid: v.boolean(),
    leadSource: v.optional(v.string()),
    notes: v.optional(v.string()),
    editToken: v.string(),
    detailsBlob: v.optional(v.any()),
    contactId: v.optional(v.id("contacts")),
  })
    .index("by_edit_token", ["editToken"])
    .index("by_status_and_date", ["status", "eventDate"]),

  tasks: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("not-started"),
      v.literal("waiting-to-start"),
      v.literal("in-progress"),
      v.literal("waiting-for-feedback"),
      v.literal("done"),
      v.literal("delay"),
      v.literal("cancelled"),
    ),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    tags: v.array(v.string()),
    dueDate: v.optional(v.number()),
    assigneeUserId: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  }),

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.array(v.string()),
    priority: v.optional(v.string()),
    dueDate: v.optional(v.number()),
  }),

  events: defineTable({
    title: v.string(),
    start: v.number(),
    end: v.optional(v.number()),
    details: v.optional(v.string()),
    url: v.optional(v.string()),
    type: v.union(
      v.literal("rehearsal"),
      v.literal("meeting"),
      v.literal("gig"),
      v.literal("other"),
    ),
  }),

  discussions: defineTable({
    title: v.string(),
    category: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("archived"),
    ),
    members: v.array(v.string()),
    lastActivity: v.number(),
    bookingId: v.optional(v.id("bookings")),
    taskId: v.optional(v.id("tasks")),
    projectId: v.optional(v.id("projects")),
  }),

  messages: defineTable({
    discussionId: v.id("discussions"),
    authorUserId: v.string(),
    bodyHtml: v.string(),
    createdAt: v.number(),
  }).index("by_discussion", ["discussionId", "createdAt"]),
});
