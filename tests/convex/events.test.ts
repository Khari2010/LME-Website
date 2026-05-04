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
