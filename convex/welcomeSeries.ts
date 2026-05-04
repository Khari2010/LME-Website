/**
 * P2-T4: Welcome series (drip campaigns).
 *
 * The Convex (V8) layer — schema mutations + queries. The actual email send
 * happens in `convex/welcomeSeriesAction.ts` (Node) which is fired by the
 * hourly cron registered in `convex/crons.ts`.
 *
 * Architecture:
 *   - `welcomeSeriesSteps`        — admin-editable template rows
 *   - `welcomeSeriesEnrollments`  — per-contact tracker
 *
 * Public flow:
 *   1. New contact created (via `contacts.signupOrLogin` or
 *      `contacts.addManualContact`) → scheduler.runAfter(0, enrollContact, …)
 *   2. Hourly cron tick → fetch due enrollments → send next step → advance.
 *   3. Contact unsubscribes / bounces / complains → cancelForContact.
 */

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireWrite, requireAuth } from "./auth";

const DEFAULT_SERIES_KEY = "enhancers-default";

// ===== Admin queries =====

async function listStepsImpl(
  ctx: import("./_generated/server").QueryCtx,
  seriesKey: string,
) {
  return await ctx.db
    .query("welcomeSeriesSteps")
    .withIndex("by_series_and_step", (q) => q.eq("seriesKey", seriesKey))
    .order("asc")
    .collect();
}

/**
 * List all steps for a given series (default: enhancers-default), ordered by
 * stepIndex ascending. Used by admin UI; the cron-driven action uses the
 * internal twin below to bypass the auth gate.
 */
export const listSteps = query({
  args: { seriesKey: v.optional(v.string()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const key = args.seriesKey ?? DEFAULT_SERIES_KEY;
    return await listStepsImpl(ctx, key);
  },
});

export const listStepsInternal = internalQuery({
  args: { seriesKey: v.optional(v.string()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const key = args.seriesKey ?? DEFAULT_SERIES_KEY;
    return await listStepsImpl(ctx, key);
  },
});

// ===== Admin mutation =====

/**
 * Create or replace a step (keyed on seriesKey + stepIndex). Called from the
 * admin template editor. We pin to the unique row by index — there should be
 * exactly one row per (seriesKey, stepIndex).
 */
export const upsertStep = mutation({
  args: {
    seriesKey: v.string(),
    stepIndex: v.number(),
    delayDays: v.number(),
    subject: v.string(),
    bodyHtml: v.string(),
    active: v.boolean(),
  },
  returns: v.id("welcomeSeriesSteps"),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "marketing");
    const existing = await ctx.db
      .query("welcomeSeriesSteps")
      .withIndex("by_series_and_step", (q) =>
        q.eq("seriesKey", args.seriesKey).eq("stepIndex", args.stepIndex),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        delayDays: args.delayDays,
        subject: args.subject,
        bodyHtml: args.bodyHtml,
        active: args.active,
      });
      return existing._id;
    }
    return await ctx.db.insert("welcomeSeriesSteps", args);
  },
});

// ===== Internal mutations + query (called by cron + signup paths) =====

/**
 * Idempotent: enrol a contact into a welcome series. Called from
 * `contacts.signupOrLogin` (enhancers-signup + mailing-list paths) and from
 * `contacts.addManualContact` via `ctx.scheduler.runAfter(0, …)`.
 *
 * No-op if:
 *   - the contact is already enrolled in this series
 *   - the series has no active steps yet (e.g. seed not yet run)
 */
export const enrollContact = internalMutation({
  args: { contactId: v.id("contacts"), seriesKey: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const seriesKey = args.seriesKey ?? DEFAULT_SERIES_KEY;

    // Idempotent: skip if already enrolled (active OR completed/cancelled).
    // We never re-enrol a contact in the same series — that's by design.
    const existing = await ctx.db
      .query("welcomeSeriesEnrollments")
      .withIndex("by_contact_and_series", (q) =>
        q.eq("contactId", args.contactId).eq("seriesKey", seriesKey),
      )
      .unique();
    if (existing) return null;

    // Find first active step (lowest stepIndex with active === true).
    const steps = await ctx.db
      .query("welcomeSeriesSteps")
      .withIndex("by_series_and_step", (q) => q.eq("seriesKey", seriesKey))
      .order("asc")
      .collect();
    const firstActive = steps.find((s) => s.active);
    if (!firstActive) return null; // no active steps — nothing to enrol into

    const now = Date.now();
    const nextDue = now + firstActive.delayDays * 24 * 60 * 60 * 1000;
    await ctx.db.insert("welcomeSeriesEnrollments", {
      contactId: args.contactId,
      seriesKey,
      enrolledAt: now,
      nextStepDueAt: nextDue,
      nextStepIndex: firstActive.stepIndex,
    });
    return null;
  },
});

/**
 * Cancel all active enrollments for a contact. Called when a contact
 * unsubscribes / bounces / complains, so they don't continue receiving the
 * drip after they've opted out. Idempotent — already-cancelled / already-
 * completed enrollments are skipped.
 */
export const cancelForContact = internalMutation({
  args: { contactId: v.id("contacts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("welcomeSeriesEnrollments")
      .filter((q) => q.eq(q.field("contactId"), args.contactId))
      .collect();
    for (const e of enrollments) {
      if (e.cancelledAt || e.completedAt) continue;
      await ctx.db.patch(e._id, { cancelledAt: Date.now() });
    }
    return null;
  },
});

/**
 * List enrollments whose `nextStepDueAt` has passed and which are still
 * active (not cancelled, not completed). Called from the hourly cron tick
 * via the internal API so cron-context (no Clerk identity) can read it.
 */
export const listDueEnrollments = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("welcomeSeriesEnrollments")
      .filter((q) =>
        q.and(
          q.lte(q.field("nextStepDueAt"), now),
          q.eq(q.field("completedAt"), undefined),
          q.eq(q.field("cancelledAt"), undefined),
        ),
      )
      .collect();
  },
});

/**
 * Advance an enrollment to the next step (after the current step has fired).
 * If there's no next active step, mark the enrollment `completedAt = now`.
 *
 * Used by the cron tick after a successful send.
 */
export const advanceEnrollment = internalMutation({
  args: { enrollmentId: v.id("welcomeSeriesEnrollments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const e = await ctx.db.get(args.enrollmentId);
    if (!e || e.cancelledAt || e.completedAt) return null;

    const nextIndex = e.nextStepIndex + 1;
    const nextStep = await ctx.db
      .query("welcomeSeriesSteps")
      .withIndex("by_series_and_step", (q) =>
        q.eq("seriesKey", e.seriesKey).eq("stepIndex", nextIndex),
      )
      .unique();

    if (!nextStep || !nextStep.active) {
      // Series complete — no more (active) steps.
      await ctx.db.patch(args.enrollmentId, { completedAt: Date.now() });
    } else {
      const now = Date.now();
      await ctx.db.patch(args.enrollmentId, {
        nextStepIndex: nextIndex,
        nextStepDueAt: now + nextStep.delayDays * 24 * 60 * 60 * 1000,
      });
    }
    return null;
  },
});

// ===== One-shot seed =====

/**
 * Seed the default 3-step enhancers series. Idempotent — re-running is a
 * no-op once the steps exist. Run from the Convex dashboard after deploy:
 *   `npx convex run welcomeSeries:seedDefaultSeries`
 */
export const seedDefaultSeries = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const seriesKey = DEFAULT_SERIES_KEY;
    const existing = await ctx.db
      .query("welcomeSeriesSteps")
      .withIndex("by_series_and_step", (q) => q.eq("seriesKey", seriesKey))
      .collect();
    if (existing.length > 0) return null;

    const steps = [
      {
        stepIndex: 0,
        delayDays: 0,
        subject: "Welcome to LME Enhancers",
        bodyHtml: `<p>Hey {{firstName}},</p>
<p>Welcome to LME Enhancers — the mailing list for fans, friends, and folks who want the inside line on what we're doing.</p>
<p>You'll hear from us a few times a year with new mixes, gig dates, and behind-the-scenes bits. Nothing else.</p>
<p>— The LME team</p>
<p><small><a href="{{unsubscribeUrl}}">Unsubscribe</a> any time.</small></p>`,
      },
      {
        stepIndex: 1,
        delayDays: 3,
        subject: "What LME is about",
        bodyHtml: `<p>Hey {{firstName}},</p>
<p>Quick one — we're a 5-piece live band out of Birmingham. We do Afrobeats, RnB, Soca, Disco, Pop, Gospel — all the genres that make a function move.</p>
<p>If you want a taste, here's our latest mix: <a href="https://soundcloud.com/lme-band">soundcloud.com/lme-band</a></p>
<p>— LME</p>
<p><small><a href="{{unsubscribeUrl}}">Unsubscribe</a></small></p>`,
      },
      {
        stepIndex: 2,
        delayDays: 7,
        subject: "Catch us live",
        bodyHtml: `<p>Hey {{firstName}},</p>
<p>If you've vibed with the mixes — come see us live. We do private bookings + a few flagship shows a year (Summer Show, EOY Show).</p>
<p>Forward this to a mate who'd be into it. We'll be in touch with show news as it lands.</p>
<p>— LME</p>
<p><small><a href="{{unsubscribeUrl}}">Unsubscribe</a></small></p>`,
      },
    ];

    for (const s of steps) {
      await ctx.db.insert("welcomeSeriesSteps", {
        seriesKey,
        ...s,
        active: true,
      });
    }
    return null;
  },
});
