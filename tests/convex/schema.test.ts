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

describe("schema — events table v2", () => {
  test("creates an event with full external-booking shape", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Bria + Kris Wedding",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: new Date("2026-07-25").getTime(),
      isAllDay: true,
      client: { name: "Bria Mardenborough", email: "bria@example.com" },
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.type).toBe("Wedding");
    expect(event?.family).toBe("ExternalBooking");
    expect(event?.client?.name).toBe("Bria Mardenborough");
  });
});
