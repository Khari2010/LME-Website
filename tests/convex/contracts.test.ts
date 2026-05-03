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

async function setup(t: ReturnType<typeof convexTest>) {
  const id = await t.mutation(api.events.create, {
    name: "Test Wedding",
    type: "Wedding",
    family: "ExternalBooking",
    status: "FormReturned",
    startDate: new Date("2026-09-01").getTime(),
    isAllDay: true,
    client: { name: "Test Client", email: "test@example.com" },
    finance: { fee: 1500 },
    bookingConfig: {
      bandConfig: "5-piece",
      djRequired: false,
      equipmentSource: "LME",
      extras: [],
    },
  });
  return id;
}

describe("contracts", () => {
  test("sendContract advances status, generates token, populates contract.sentAt + auditLog", async () => {
    const t = convexTest(schema, modules);
    const id = await setup(t);
    const result = await t.mutation(api.contracts.sendContract, { id });
    expect(result.token).toMatch(/^[0-9a-f]+$/);
    expect(result.token.length).toBeGreaterThanOrEqual(32);
    expect(result.portalUrl).toContain("/contract");
    const event = await t.query(api.events.getById, { id });
    expect(event?.status).toBe("ContractSent");
    expect(event?.contract?.sentAt).toBeDefined();
    expect(event?.contract?.auditLog?.[0]?.action).toBe("contract_sent");
  });

  test("getContractData returns rendered HTML for valid token", async () => {
    const t = convexTest(schema, modules);
    const id = await setup(t);
    const { token } = await t.mutation(api.contracts.sendContract, { id });
    const data = await t.query(api.contracts.getContractData, { token });
    expect(data).not.toBeNull();
    expect(data?.html).toContain("LME PERFORMANCE CONTRACT");
    expect(data?.html).toContain("Test Client");
    // £1500.00 (toFixed(2)) — assert on the integer portion to be flexible.
    expect(data?.html).toContain("£1500");
  });

  test("signContract sets signedAt + signedByName, advances status, appends auditLog", async () => {
    const t = convexTest(schema, modules);
    const id = await setup(t);
    const { token } = await t.mutation(api.contracts.sendContract, { id });
    await t.mutation(api.contracts.signContract, {
      token,
      signedByName: "Test Client",
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.status).toBe("ContractSigned");
    expect(event?.contract?.signedAt).toBeDefined();
    expect(event?.contract?.signedByName).toBe("Test Client");
    expect(event?.contract?.auditLog?.length).toBe(2); // sent + signed
    expect(event?.contract?.auditLog?.[1]?.action).toBe("contract_signed");
  });

  test("signContract rejects empty name", async () => {
    const t = convexTest(schema, modules);
    const id = await setup(t);
    const { token } = await t.mutation(api.contracts.sendContract, { id });
    await expect(
      t.mutation(api.contracts.signContract, {
        token,
        signedByName: "  ",
      }),
    ).rejects.toThrow("name required");
  });

  test("signContract rejects already-signed", async () => {
    const t = convexTest(schema, modules);
    const id = await setup(t);
    const { token } = await t.mutation(api.contracts.sendContract, { id });
    await t.mutation(api.contracts.signContract, {
      token,
      signedByName: "Test",
    });
    await expect(
      t.mutation(api.contracts.signContract, {
        token,
        signedByName: "Test",
      }),
    ).rejects.toThrow("already signed");
  });

  test("sendContract rejects when fee not set", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "No Fee",
      type: "Wedding",
      family: "ExternalBooking",
      status: "FormReturned",
      startDate: Date.now(),
      isAllDay: true,
      client: { name: "X", email: "x@y.com" },
    });
    await expect(
      t.mutation(api.contracts.sendContract, { id }),
    ).rejects.toThrow("fee required");
  });
});
