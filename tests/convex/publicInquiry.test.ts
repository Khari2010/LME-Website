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

describe("publicInquiry.submitInquiry", () => {
  test("creates an event with status=Inquiry, family=ExternalBooking", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.publicInquiry.submitInquiry, {
      clientName: "Janice Doe",
      clientEmail: "janice@example.com",
      eventType: "Wedding",
      eventDate: new Date("2026-09-12").getTime(),
      venue: "St Mary's Hall",
      description: "Looking for live band for ceremony + reception",
    });
    expect(result.eventId).toBeDefined();

    const event = await t.query(api.events.getById, { id: result.eventId });
    expect(event?.status).toBe("Inquiry");
    expect(event?.family).toBe("ExternalBooking");
    expect(event?.type).toBe("Wedding");
    expect(event?.client?.email).toBe("janice@example.com");
  });

  test("rejects when required fields missing", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.publicInquiry.submitInquiry, {
        clientName: "",
        clientEmail: "x@y.com",
        eventType: "Wedding",
        eventDate: Date.now(),
      }),
    ).rejects.toThrow();
  });
});
