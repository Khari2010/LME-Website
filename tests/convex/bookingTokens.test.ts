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

// Helper: create a minimal event so we have a valid `eventId` to mint tokens
// against.
async function createTestEvent(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{ name: string; status: string }> = {},
) {
  return await t.mutation(api.events.create, {
    name: overrides.name ?? "Test Booking",
    type: "Wedding",
    family: "ExternalBooking",
    status: overrides.status ?? "Inquiry",
    startDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    isAllDay: true,
  });
}

describe("bookingTokens", () => {
  test("mintForEvent produces a unique 32+ char URL-safe token", async () => {
    const t = convexTest(schema, modules);
    const eventId = await createTestEvent(t);

    const a = await t.mutation(internal.bookingTokens.mintForEvent, {
      eventId,
    });
    const b = await t.mutation(internal.bookingTokens.mintForEvent, {
      eventId,
    });

    expect(a.token.length).toBeGreaterThanOrEqual(32);
    expect(b.token.length).toBeGreaterThanOrEqual(32);
    expect(a.token).not.toBe(b.token);
    // URL-safe: only unreserved characters (alphanumeric, `-`, `_`, `.`, `~`).
    expect(a.token).toMatch(/^[A-Za-z0-9._~-]+$/);
    expect(typeof a.expiresAt).toBe("number");
    expect(a.expiresAt).toBeGreaterThan(Date.now());
  });

  test("verifyToken returns valid for a fresh mint", async () => {
    const t = convexTest(schema, modules);
    const eventId = await createTestEvent(t);

    const { token } = await t.mutation(internal.bookingTokens.mintForEvent, {
      eventId,
    });

    const result = await t.query(api.bookingTokens.verifyToken, { token });
    expect(result.valid).toBe(true);
    expect(result.eventId).toBe(eventId);
    expect(result.reason).toBeUndefined();
  });

  test("verifyToken returns invalid for revoked token", async () => {
    const t = convexTest(schema, modules);
    const eventId = await createTestEvent(t);

    const { token } = await t.mutation(internal.bookingTokens.mintForEvent, {
      eventId,
    });
    // Sanity: still valid before revoke.
    const before = await t.query(api.bookingTokens.verifyToken, { token });
    expect(before.valid).toBe(true);

    await t.mutation(internal.bookingTokens.revokeForEvent, { eventId });

    const after = await t.query(api.bookingTokens.verifyToken, { token });
    expect(after.valid).toBe(false);
    expect(after.reason).toBe("revoked");
    expect(after.eventId).toBeUndefined();
  });

  test("verifyToken returns invalid for expired token", async () => {
    const t = convexTest(schema, modules);
    const eventId = await createTestEvent(t);

    // Mint a token that is already expired (negative TTL).
    const { token } = await t.mutation(internal.bookingTokens.mintForEvent, {
      eventId,
      expiresInMs: -1000,
    });

    const result = await t.query(api.bookingTokens.verifyToken, { token });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
    expect(result.eventId).toBeUndefined();
  });

  test("verifyToken returns invalid for unknown token", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.bookingTokens.verifyToken, {
      token: "this-token-does-not-exist",
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("not_found");
    expect(result.eventId).toBeUndefined();
  });

  test("revokeForEvent revokes ALL tokens linked to the event", async () => {
    const t = convexTest(schema, modules);
    const eventId = await createTestEvent(t);

    const a = await t.mutation(internal.bookingTokens.mintForEvent, {
      eventId,
    });
    const b = await t.mutation(internal.bookingTokens.mintForEvent, {
      eventId,
    });

    await t.mutation(internal.bookingTokens.revokeForEvent, { eventId });

    const ra = await t.query(api.bookingTokens.verifyToken, { token: a.token });
    const rb = await t.query(api.bookingTokens.verifyToken, { token: b.token });
    expect(ra.valid).toBe(false);
    expect(rb.valid).toBe(false);
    expect(ra.reason).toBe("revoked");
    expect(rb.reason).toBe("revoked");
  });
});
