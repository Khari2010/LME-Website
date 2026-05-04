import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../../convex/**/*.*s");

describe("analytics", () => {
  test("getQuarterlyRevenue returns N quarters with paid revenue", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await t.mutation(api.events.create, {
      name: "Wedding A",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Completed",
      startDate: now,
      isAllDay: true,
      finance: {
        fee: 1000,
        deposit: { amount: 500, paid: true, paidAt: now },
        balance: { amount: 500, dueDate: now, paid: true, paidAt: now },
      },
    });
    const result = await t.query(api.analytics.getQuarterlyRevenue, {
      quarters: 2,
    });
    expect(result).toHaveLength(2);
    // Current quarter contains the paid amounts
    const total = result.reduce((s, q) => s + q.revenue, 0);
    expect(total).toBe(1000);
  });

  test("getPipelineConversion buckets statuses correctly", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await t.mutation(api.events.create, {
      name: "A",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: now,
      isAllDay: true,
    });
    await t.mutation(api.events.create, {
      name: "B",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: now,
      isAllDay: true,
    });
    await t.mutation(api.events.create, {
      name: "C",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Completed",
      startDate: now,
      isAllDay: true,
    });
    await t.mutation(api.events.create, {
      name: "D",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Lost",
      startDate: now,
      isAllDay: true,
    });
    const result = await t.query(api.analytics.getPipelineConversion, {});
    expect(result.inquiry).toBe(1);
    expect(result.booked).toBe(1);
    expect(result.completed).toBe(1);
    expect(result.lost).toBe(1);
    expect(result.conversionRate).toBe(0.5); // 2 closed / 4 total
  });

  test("getFanGrowth counts enhancers signups per month", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    await t.run((ctx) =>
      ctx.db.insert("contacts", {
        email: "a@b.com",
        source: "enhancers-signup",
        tags: [],
        status: "active",
        signupDate: now,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("contacts", {
        email: "c@d.com",
        source: "enhancers-signup",
        tags: [],
        status: "active",
        signupDate: monthAgo,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("contacts", {
        email: "x@y.com",
        source: "manual",
        tags: [],
        status: "active",
        signupDate: now,
      }),
    );
    const result = await t.query(api.analytics.getFanGrowth, { months: 3 });
    expect(result.totalActive).toBe(2); // manual contact excluded
  });

  test("getCampaignSummary aggregates from campaignEvents", async () => {
    const t = convexTest(schema, modules);
    const cId = await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        status: "sent",
        subjectLine: "X",
        bodyHtml: "<p>x</p>",
        recipientCount: 100,
        sentDate: Date.now(),
      }),
    );
    for (const type of ["delivered", "delivered", "opened", "clicked"] as const) {
      await t.run((ctx) =>
        ctx.db.insert("campaignEvents", {
          campaignId: cId,
          resendMessageId: type,
          recipientEmail: `${type}@example.com`,
          type,
          occurredAt: Date.now(),
        }),
      );
    }
    const summary = await t.query(api.analytics.getCampaignSummary, {
      limit: 5,
    });
    expect(summary.totalSent).toBe(100);
    expect(summary.deliveredCount).toBe(2);
    expect(summary.openedCount).toBe(1);
    expect(summary.openRate).toBe(0.5); // 1 opened / 2 delivered
  });

  test("getTicketVelocity returns null when no ticketing", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "X",
      type: "MainShow",
      family: "InternalShow",
      status: "Planning",
      startDate: Date.now(),
      isAllDay: true,
    });
    expect(
      await t.query(api.analytics.getTicketVelocity, { eventId: id }),
    ).toBeNull();
  });
});
