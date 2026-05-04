import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// Pass the module map explicitly so convex-test doesn't rely on its own
// `import.meta.glob` (which only works when convex-test itself is transformed
// by Vite). The cast is needed because TypeScript doesn't know about the
// Vite-injected `glob` method on `import.meta`.
const modules = (import.meta as ImportMeta & {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}).glob("../../convex/**/*.*s");

describe("events queries", () => {
  test("listByFamily returns only matching family", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.events.create, {
      name: "Wedding A",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: Date.now(),
      isAllDay: true,
    });
    await t.mutation(api.events.create, {
      name: "Summer Show",
      type: "MainShow",
      family: "InternalShow",
      status: "Planning",
      startDate: Date.now(),
      isAllDay: true,
    });

    const externals = await t.query(api.events.listByFamily, {
      family: "ExternalBooking",
    });
    expect(externals).toHaveLength(1);
    expect(externals[0].name).toBe("Wedding A");
  });

  test("listByFamily orders by startDate ascending", async () => {
    const t = convexTest(schema, modules);
    const t1 = new Date("2026-08-01").getTime();
    const t2 = new Date("2026-07-01").getTime();
    await t.mutation(api.events.create, {
      name: "Later",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: t1,
      isAllDay: true,
    });
    await t.mutation(api.events.create, {
      name: "Sooner",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: t2,
      isAllDay: true,
    });

    const list = await t.query(api.events.listByFamily, {
      family: "ExternalBooking",
    });
    expect(list[0].name).toBe("Sooner");
    expect(list[1].name).toBe("Later");
  });

  test("setStatus updates status field", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "X",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: Date.now(),
      isAllDay: true,
    });
    await t.mutation(api.events.setStatus, { id, status: "Quoted" });
    const event = await t.query(api.events.getById, { id });
    expect(event?.status).toBe("Quoted");
  });

  test("setShowRun sorts items by order before saving", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Summer Show",
      type: "MainShow",
      family: "InternalShow",
      status: "Planning",
      startDate: Date.now(),
      isAllDay: true,
    });
    await t.mutation(api.events.setShowRun, {
      id,
      items: [
        { order: 2, name: "Outro", durationMins: 5 },
        { order: 0, name: "Intro", durationMins: 3 },
        { order: 1, name: "Set 1", durationMins: 30 },
      ],
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.showRun?.[0].name).toBe("Intro");
    expect(event?.showRun?.[1].name).toBe("Set 1");
    expect(event?.showRun?.[2].name).toBe("Outro");
  });

  test("setProduction patches the production sub-block", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Summer Show",
      type: "MainShow",
      family: "InternalShow",
      status: "Planning",
      startDate: Date.now(),
      isAllDay: true,
    });
    await t.mutation(api.events.setProduction, {
      id,
      production: {
        crew: [{ name: "Camara", role: "Décor lead" }],
        suppliers: [{ name: "Sound Co.", service: "PA" }],
        loadIn: 1000,
        decorTeam: "4 people",
      },
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.production?.crew[0].name).toBe("Camara");
    expect(event?.production?.loadIn).toBe(1000);
    expect(event?.production?.decorTeam).toBe("4 people");
  });

  test("setAfterParty patches the afterParty sub-block", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Summer Show",
      type: "MainShow",
      family: "InternalShow",
      status: "Planning",
      startDate: Date.now(),
      isAllDay: true,
    });
    await t.mutation(api.events.setAfterParty, {
      id,
      afterParty: {
        venue: "Mamas lounge",
        host: "KS",
        djLineup: ["MJ", "Mara Boy"],
        sections: [
          { name: "Tribal House", durationMins: 30, genre: "Tribal House" },
        ],
      },
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.afterParty?.venue).toBe("Mamas lounge");
    expect(event?.afterParty?.djLineup).toHaveLength(2);
    expect(event?.afterParty?.sections[0].durationMins).toBe(30);
  });

  test("setMarketingPlan saves weeks sorted by weekIndex", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Summer Show",
      type: "MainShow",
      family: "InternalShow",
      status: "Planning",
      startDate: Date.now(),
      isAllDay: true,
    });
    await t.mutation(api.events.setMarketingPlan, {
      id,
      plan: {
        weeks: [
          { weekIndex: 3, theme: "Final push", posts: [] },
          {
            weekIndex: 1,
            theme: "Announce",
            posts: [
              {
                platform: "Instagram",
                copy: "Save the date",
                sent: false,
              },
            ],
          },
          { weekIndex: 2, theme: "Tease", posts: [] },
        ],
        eventbriteUrl: "https://eventbrite.co.uk/e/123",
      },
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.marketingPlan?.weeks[0].weekIndex).toBe(1);
    expect(event?.marketingPlan?.weeks[2].weekIndex).toBe(3);
    expect(event?.marketingPlan?.eventbriteUrl).toBe(
      "https://eventbrite.co.uk/e/123",
    );
  });

  test("setTicketing patches the ticketing block", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Summer Show",
      type: "MainShow",
      family: "InternalShow",
      status: "Planning",
      startDate: Date.now(),
      isAllDay: true,
    });
    await t.mutation(api.events.setTicketing, {
      id,
      ticketing: {
        platform: "Eventbrite",
        externalEventId: "1234567890",
        tiers: [
          { name: "Super Early Bird", price: 10, capacity: 50, sold: 7 },
          { name: "GA", price: 25, capacity: 200, sold: 0 },
        ],
        voucherCodes: [{ code: "POPUP10", discount: 10, usedCount: 7 }],
      },
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.ticketing?.platform).toBe("Eventbrite");
    expect(event?.ticketing?.tiers).toHaveLength(2);
    expect(event?.ticketing?.voucherCodes?.[0].code).toBe("POPUP10");
  });

  test("setSponsorship patches activations + cutoffDate", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Summer Show",
      type: "MainShow",
      family: "InternalShow",
      status: "Planning",
      startDate: Date.now(),
      isAllDay: true,
    });
    const cutoff = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await t.mutation(api.events.setSponsorship, {
      id,
      sponsorship: {
        activations: [
          { brandName: "Acme Corp", stage: "interested", basePackage: 250 },
          {
            brandName: "Beta Co",
            stage: "pitched",
            basePackage: 250,
            contact: "x@y.com",
          },
        ],
        cutoffDate: cutoff,
      },
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.sponsorship?.activations).toHaveLength(2);
    expect(event?.sponsorship?.activations[0].brandName).toBe("Acme Corp");
    expect(event?.sponsorship?.cutoffDate).toBe(cutoff);
  });

  test("triggerTicketingSync rejects when externalEventId missing", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "X",
      type: "MainShow",
      family: "InternalShow",
      status: "Planning",
      startDate: Date.now(),
      isAllDay: true,
      ticketing: { platform: "Eventbrite", tiers: [] },
    });
    await expect(
      t.mutation(api.events.triggerTicketingSync, { id }),
    ).rejects.toThrow("Set externalEventId");
  });

  test("listForCalendar returns events overlapping the range", async () => {
    const t = convexTest(schema, modules);
    const inRange = new Date("2026-07-15").getTime();
    const outOfRange = new Date("2027-01-15").getTime();
    await t.mutation(api.events.create, {
      name: "In",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: inRange,
      isAllDay: true,
    });
    await t.mutation(api.events.create, {
      name: "Out",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: outOfRange,
      isAllDay: true,
    });

    const result = await t.query(api.events.listForCalendar, {
      from: new Date("2026-07-01").getTime(),
      to: new Date("2026-08-01").getTime(),
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("In");
  });
});
