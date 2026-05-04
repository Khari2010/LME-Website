import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { internal, api } from "../../convex/_generated/api";

// Pass the module map explicitly so convex-test doesn't rely on its own
// `import.meta.glob` (which only works when convex-test itself is transformed
// by Vite). The cast is needed because TypeScript doesn't know about the
// Vite-injected `glob` method on `import.meta`.
const modules = (import.meta as ImportMeta & {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}).glob("../../convex/**/*.*s");

describe("bookings → events migration", () => {
  test("imports a wedding correctly", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(
      internal.migrations.bookingsToEvents.importOne,
      {
        notion: {
          bookingName: "Bria + Kris Wedding",
          clientName: "Bria Mardenborough",
          clientEmail: "bria@example.com",
          eventType: "Wedding",
          eventDate: new Date("2026-07-25").getTime(),
          venue: "The Venue, Walsall",
          genres: ["Afrobeats", "00s RnB"],
          djRequired: false,
          status: "Deposit Paid",
          fee: 1750,
          depositPaid: true,
          notes: "Performance window 8:30-9:30pm",
        },
      },
    );
    const event = await t.query(api.events.getById, { id });
    expect(event?.type).toBe("Wedding");
    expect(event?.status).toBe("Booked");
    expect(event?.client?.name).toBe("Bria Mardenborough");
    expect(event?.finance?.fee).toBe(1750);
    expect(event?.finance?.deposit?.paid).toBe(true);
  });

  test("maps unknown event type to Other", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(
      internal.migrations.bookingsToEvents.importOne,
      {
        notion: {
          bookingName: "X",
          eventType: "WeirdType",
          eventDate: Date.now(),
          genres: [],
          djRequired: false,
          depositPaid: false,
        },
      },
    );
    const event = await t.query(api.events.getById, { id });
    expect(event?.type).toBe("Other");
  });
});
