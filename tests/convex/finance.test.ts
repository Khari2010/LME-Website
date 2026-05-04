import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// Pass the module map explicitly — see other Convex test files for context.
const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../../convex/**/*.*s");

describe("finance.getInvoicesView", () => {
  test("includes events with finance set, excludes empty", async () => {
    const t = convexTest(schema, modules);
    const id1 = await t.mutation(api.events.create, {
      name: "With finance",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: new Date("2026-09-01").getTime(),
      isAllDay: true,
      client: { name: "Bria", email: "b@example.com" },
      finance: {
        fee: 1000,
        deposit: { amount: 500, paid: true, paidAt: Date.now() },
      },
    });
    await t.mutation(api.events.create, {
      name: "No finance",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: Date.now(),
      isAllDay: true,
    });
    const view = await t.query(api.finance.getInvoicesView, {});
    expect(view).toHaveLength(1);
    expect(view[0].eventId).toBe(id1);
    expect(view[0].clientName).toBe("Bria");
    expect(view[0].depositPaid).toBe(true);
    expect(view[0].balancePaid).toBe(false);
  });

  test("flags overdue when balance dueDate is past", async () => {
    const t = convexTest(schema, modules);
    const past = Date.now() - 10 * 24 * 60 * 60 * 1000;
    await t.mutation(api.events.create, {
      name: "Overdue",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: past,
      isAllDay: true,
      finance: {
        fee: 1000,
        balance: { amount: 500, dueDate: past, paid: false },
      },
    });
    const view = await t.query(api.finance.getInvoicesView, {});
    expect(view[0].overdue).toBe(true);
  });

  test("does not flag overdue when balance is future", async () => {
    const t = convexTest(schema, modules);
    const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await t.mutation(api.events.create, {
      name: "Upcoming",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: future,
      isAllDay: true,
      finance: {
        fee: 1000,
        deposit: { amount: 500, paid: true, paidAt: Date.now() },
        balance: { amount: 500, dueDate: future, paid: false },
      },
    });
    const view = await t.query(api.finance.getInvoicesView, {});
    expect(view[0].overdue).toBe(false);
  });
});

describe("finance.getCashflowSummary", () => {
  test("computes revenue from paid deposits + balances in current quarter", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await t.mutation(api.events.create, {
      name: "Paid event",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Completed",
      startDate: now,
      isAllDay: true,
      finance: {
        fee: 1500,
        deposit: { amount: 500, paid: true, paidAt: now },
        balance: { amount: 1000, dueDate: now + 1000, paid: true, paidAt: now },
      },
    });
    const summary = await t.query(api.finance.getCashflowSummary, {
      quarters: 1,
    });
    expect(summary.totalRevenue).toBe(1500);
    expect(summary.quarters).toHaveLength(1);
    expect(summary.quarters[0].revenue).toBe(1500);
    expect(summary.quarters[0].expenses).toBe(0);
    expect(summary.quarters[0].net).toBe(1500);
  });

  test("excludes unpaid finance entries from revenue", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await t.mutation(api.events.create, {
      name: "Awaiting payment",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: now,
      isAllDay: true,
      finance: {
        fee: 2000,
        deposit: { amount: 1000, paid: false },
        balance: { amount: 1000, dueDate: now + 1000, paid: false },
      },
    });
    const summary = await t.query(api.finance.getCashflowSummary, {
      quarters: 1,
    });
    expect(summary.totalRevenue).toBe(0);
  });

  test("default quarter count is 4", async () => {
    const t = convexTest(schema, modules);
    const summary = await t.query(api.finance.getCashflowSummary, {});
    expect(summary.quarters).toHaveLength(4);
    // Quarters returned oldest-first
    const labels = summary.quarters.map((q) => q.label);
    expect(new Set(labels).size).toBe(4);
  });
});

describe("finance.getContractsView", () => {
  test("includes only events with contract.sentAt", async () => {
    const t = convexTest(schema, modules);
    const sentAt = Date.now() - 5 * 24 * 60 * 60 * 1000;
    await t.mutation(api.events.create, {
      name: "Contract sent",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: Date.now(),
      isAllDay: true,
      client: { name: "Acme", email: "a@example.com" },
      contract: {
        sentAt,
        auditLog: [{ ts: sentAt, action: "sent" }],
      },
    });
    await t.mutation(api.events.create, {
      name: "No contract",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: Date.now(),
      isAllDay: true,
    });
    const view = await t.query(api.finance.getContractsView, {});
    expect(view).toHaveLength(1);
    expect(view[0].eventName).toBe("Contract sent");
    expect(view[0].sentAt).toBe(sentAt);
    expect(view[0].signedAt).toBeUndefined();
  });

  test("orders by sentAt descending", async () => {
    const t = convexTest(schema, modules);
    const old = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = Date.now() - 1 * 24 * 60 * 60 * 1000;
    await t.mutation(api.events.create, {
      name: "Old",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: Date.now(),
      isAllDay: true,
      contract: { sentAt: old, auditLog: [] },
    });
    await t.mutation(api.events.create, {
      name: "Recent",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: Date.now(),
      isAllDay: true,
      contract: { sentAt: recent, auditLog: [] },
    });
    const view = await t.query(api.finance.getContractsView, {});
    expect(view[0].eventName).toBe("Recent");
    expect(view[1].eventName).toBe("Old");
  });
});

describe("expenses queries", () => {
  // Note: expenses.create / update / remove call `requireWrite("finance")`
  // which needs an authenticated identity. convex-test supports
  // `t.withIdentity({...})` but our `requireWrite` also requires a Convex
  // `users` row matching `clerkUserId === identity.subject`. Wiring that
  // for a unit test is doable but redundant given that auth.ts is already
  // covered by convex/auth.test.ts. We test the query path here, which has
  // no auth gate.
  test("list returns empty array when no expenses recorded", async () => {
    const t = convexTest(schema, modules);
    const list = await t.query(api.expenses.list, {});
    expect(list).toEqual([]);
  });

  test("list filters by date range", async () => {
    const t = convexTest(schema, modules);
    // Bypass requireWrite by inserting directly via t.run (admin context).
    const inWindow = new Date("2026-04-15").getTime();
    const outWindow = new Date("2026-01-15").getTime();
    await t.run(async (ctx) => {
      await ctx.db.insert("expenses", {
        date: inWindow,
        amount: 100,
        category: "Travel",
        description: "Train fare",
      });
      await ctx.db.insert("expenses", {
        date: outWindow,
        amount: 200,
        category: "Equipment",
        description: "Cable",
      });
    });
    const filtered = await t.query(api.expenses.list, {
      fromMs: new Date("2026-04-01").getTime(),
      toMs: new Date("2026-05-01").getTime(),
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].description).toBe("Train fare");
  });
});
