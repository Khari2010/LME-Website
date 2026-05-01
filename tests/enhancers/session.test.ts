import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession } from "@/lib/enhancers/session";

beforeAll(() => {
  process.env.ENHANCERS_SESSION_SECRET = "0".repeat(64);
});

describe("session cookie", () => {
  it("signs and verifies a contact id", async () => {
    const cookie = await signSession("contact_abc123");
    const id = await verifySession(cookie);
    expect(id).toBe("contact_abc123");
  });

  it("rejects a tampered cookie", async () => {
    const cookie = await signSession("contact_abc123");
    const tampered = cookie.slice(0, -2) + "XX";
    await expect(verifySession(tampered)).rejects.toThrow();
  });

  it("rejects expired cookies", async () => {
    const cookie = await signSession("contact_abc123", -1);
    await expect(verifySession(cookie)).rejects.toThrow();
  });
});
