import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// Pass the module map explicitly so convex-test doesn't rely on its own
// `import.meta.glob` (which only works when convex-test itself is transformed
// by Vite). Mirrors the pattern used by the other test files in this dir.
const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../../convex/**/*.*s");

const ONE_HOUR = 60 * 60 * 1000;

describe("discoveryCall.proposeSlots", () => {
  test("advances status to DiscoveryCall + mints token + sets proposedSlots", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Test Wedding",
      type: "Wedding",
      family: "ExternalBooking",
      status: "FormReturned",
      startDate: Date.now() + 30 * 24 * ONE_HOUR,
      isAllDay: true,
      client: { name: "Test Client", email: "test@example.com" },
    });

    const future1 = Date.now() + 24 * ONE_HOUR;
    const future2 = Date.now() + 48 * ONE_HOUR;
    const future3 = Date.now() + 72 * ONE_HOUR;
    const result = await t.mutation(api.discoveryCall.proposeSlots, {
      id,
      slots: [future1, future2, future3],
    });
    expect(result.token).toMatch(/^[0-9a-f]+$/);
    expect(result.token.length).toBeGreaterThanOrEqual(32);
    expect(result.portalUrl).toContain("/discovery-call");
    expect(result.portalUrl).toContain(result.token);

    const event = await t.query(api.events.getById, { id });
    expect(event?.status).toBe("DiscoveryCall");
    expect(event?.nextActionLabel).toContain("pick a discovery call slot");
    const dc = event?.discoveryCall as
      | { proposedSlots?: number[]; proposedAt?: number }
      | undefined;
    expect(dc?.proposedSlots).toEqual([future1, future2, future3]);
    expect(typeof dc?.proposedAt).toBe("number");
  });

  test("rejects empty slots + past slots", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Test Wedding",
      type: "Wedding",
      family: "ExternalBooking",
      status: "FormReturned",
      startDate: Date.now() + 30 * 24 * ONE_HOUR,
      isAllDay: true,
      client: { name: "Test Client", email: "test@example.com" },
    });

    await expect(
      t.mutation(api.discoveryCall.proposeSlots, { id, slots: [] }),
    ).rejects.toThrow("at least one slot required");

    await expect(
      t.mutation(api.discoveryCall.proposeSlots, {
        id,
        slots: [Date.now() - ONE_HOUR],
      }),
    ).rejects.toThrow("must be in the future");
  });
});

describe("discoveryCall.pickSlot", () => {
  test("validates slot is in proposed list + rejects double-pick", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Test Wedding",
      type: "Wedding",
      family: "ExternalBooking",
      status: "FormReturned",
      startDate: Date.now() + 30 * 24 * ONE_HOUR,
      isAllDay: true,
      client: { name: "Test Client", email: "test@example.com" },
    });
    const future1 = Date.now() + 24 * ONE_HOUR;
    const future2 = Date.now() + 48 * ONE_HOUR;
    const { token } = await t.mutation(api.discoveryCall.proposeSlots, {
      id,
      slots: [future1, future2],
    });

    // Slot not in proposed list — should reject.
    await expect(
      t.mutation(api.discoveryCall.pickSlot, {
        token,
        slot: Date.now() + 99 * ONE_HOUR,
      }),
    ).rejects.toThrow("slot not in proposed list");

    // Valid pick.
    await t.mutation(api.discoveryCall.pickSlot, { token, slot: future1 });

    const event = await t.query(api.events.getById, { id });
    const dc = event?.discoveryCall as
      | { pickedSlot?: number; pickedAt?: number }
      | undefined;
    expect(dc?.pickedSlot).toBe(future1);
    expect(typeof dc?.pickedAt).toBe("number");

    // Second pick should reject.
    await expect(
      t.mutation(api.discoveryCall.pickSlot, { token, slot: future2 }),
    ).rejects.toThrow("already picked");
  });

  test("rejects with invalid token", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.discoveryCall.pickSlot, {
        token: "fake",
        slot: Date.now() + ONE_HOUR,
      }),
    ).rejects.toThrow("invalid link");
  });
});
