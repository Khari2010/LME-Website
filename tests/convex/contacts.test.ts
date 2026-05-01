import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// Pass the module map explicitly so convex-test doesn't rely on its own
// `import.meta.glob` (which only works when convex-test itself is transformed
// by Vite).
const modules = import.meta.glob("../../convex/**/*.*s");

describe("contacts mutations", () => {
  it("creates a new contact on first signup", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.contacts.signupOrLogin, { email: "fan@example.com" });
    const stats = await t.query(api.contacts.getEnhancersDashboardStats, {});
    expect(stats.total).toBe(1);
  });

  it("re-issues a token for an existing contact", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.contacts.signupOrLogin, { email: "fan@example.com" });
    await t.mutation(api.contacts.signupOrLogin, { email: "fan@example.com" });
    const stats = await t.query(api.contacts.getEnhancersDashboardStats, {});
    expect(stats.total).toBe(1);
  });

  it("normalises email to lowercase", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.contacts.signupOrLogin, { email: "Fan@Example.com" });
    await t.mutation(api.contacts.signupOrLogin, { email: "FAN@example.com" });
    const stats = await t.query(api.contacts.getEnhancersDashboardStats, {});
    expect(stats.total).toBe(1);
  });

  it("rejects an obvious bad email", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.contacts.signupOrLogin, { email: "notanemail" }),
    ).rejects.toThrow();
  });

  it("rejects an unknown magic-link token", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.contacts.redeemMagicLink, { token: "00000000-0000-0000-0000-000000000000" }),
    ).rejects.toThrow();
  });
});
