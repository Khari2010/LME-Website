import { describe, it, expect } from "vitest";
import { generateMagicToken, isTokenExpired, MAGIC_LINK_TTL_MS } from "@/lib/enhancers/tokens";

describe("magic-link tokens", () => {
  it("generates a v4-shaped UUID", () => {
    const token = generateMagicToken();
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("generates unique tokens", () => {
    const a = generateMagicToken();
    const b = generateMagicToken();
    expect(a).not.toBe(b);
  });

  it("considers a fresh token unexpired", () => {
    expect(isTokenExpired(Date.now())).toBe(false);
  });

  it("considers an old token expired", () => {
    expect(isTokenExpired(Date.now() - MAGIC_LINK_TTL_MS - 1000)).toBe(true);
  });

  it("considers a token issued exactly TTL ago expired", () => {
    expect(isTokenExpired(Date.now() - MAGIC_LINK_TTL_MS)).toBe(true);
  });
});
