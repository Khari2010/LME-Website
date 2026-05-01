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

  it("rejects a cookie with tampered payload", async () => {
    const cookie = await signSession("contact_abc123");
    const [h, p, s] = cookie.split(".");
    const decoded = JSON.parse(Buffer.from(p, "base64url").toString());
    decoded.sub = "contact_evil999";
    const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString("base64url").replace(/=+$/, "");
    await expect(verifySession(`${h}.${tamperedPayload}.${s}`)).rejects.toThrow();
  });

  it("rejects a token with alg:none", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url").replace(/=+$/, "");
    const payload = Buffer.from(JSON.stringify({ sub: "contact_evil", exp: Math.floor(Date.now()/1000) + 3600 })).toString("base64url").replace(/=+$/, "");
    const noneToken = `${header}.${payload}.`;
    await expect(verifySession(noneToken)).rejects.toThrow();
  });
});
