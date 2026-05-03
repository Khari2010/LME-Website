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

describe("bookingForm.sendFullForm", () => {
  test("mints token, advances status, returns a portal URL", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Test Wedding",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: Date.now(),
      isAllDay: true,
      client: { name: "Test Client", email: "test@example.com" },
    });

    const result = await t.mutation(api.bookingForm.sendFullForm, { id });

    expect(result.token).toMatch(/^[0-9a-f]+$/);
    expect(result.token.length).toBeGreaterThanOrEqual(32);
    expect(result.portalUrl).toContain(`/c/`);
    expect(result.portalUrl).toContain(result.token);
    expect(result.portalUrl).toContain("/booking-form");

    const event = await t.query(api.events.getById, { id });
    expect(event?.status).toBe("BookingFormSent");
    expect(event?.nextActionLabel).toContain("Awaiting client");

    // The minted token is verifiable via the public verifyToken query.
    const verified = await t.query(api.bookingTokens.verifyToken, {
      token: result.token,
    });
    expect(verified.valid).toBe(true);
    expect(verified.eventId).toBe(id);
  });

  test("rejects when client email missing", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "No Client",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: Date.now(),
      isAllDay: true,
    });
    await expect(
      t.mutation(api.bookingForm.sendFullForm, { id }),
    ).rejects.toThrow("client email required");
  });

  test("rejects for non-external-booking events", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Internal Show",
      type: "MainShow",
      family: "InternalShow",
      status: "Planning",
      startDate: Date.now(),
      isAllDay: true,
    });
    await expect(
      t.mutation(api.bookingForm.sendFullForm, { id }),
    ).rejects.toThrow("only external bookings");
  });
});

describe("bookingForm.submitFullForm", () => {
  test("writes bookingConfig, advances status, requires valid token", async () => {
    const t = convexTest(schema, modules);
    const eventId = await t.mutation(api.events.create, {
      name: "Test Wedding",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: Date.now(),
      isAllDay: true,
      client: { name: "Test", email: "t@e.com" },
    });
    const { token } = await t.mutation(api.bookingForm.sendFullForm, {
      id: eventId,
    });

    await t.mutation(api.bookingForm.submitFullForm, {
      token,
      bandConfig: "5-piece",
      djRequired: true,
      equipmentSource: "LME",
      extras: ["DJ"],
      expectedGuests: 120,
      notes: "Outdoor venue",
    });

    const event = await t.query(api.events.getById, { id: eventId });
    expect(event?.status).toBe("FormReturned");
    expect(event?.bookingConfig?.bandConfig).toBe("5-piece");
    expect(event?.bookingConfig?.djRequired).toBe(true);
    expect(event?.bookingConfig?.expectedGuests).toBe(120);
    expect(event?.notes).toContain("Outdoor venue");
  });

  test("rejects with invalid token", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.bookingForm.submitFullForm, {
        token: "fake",
        bandConfig: "5-piece",
        djRequired: false,
        equipmentSource: "LME",
        extras: [],
      }),
    ).rejects.toThrow("invalid link");
  });
});
