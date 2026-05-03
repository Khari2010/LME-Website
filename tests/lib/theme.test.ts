import { describe, expect, test } from "vitest";
import { resolveInitialTheme } from "../../src/lib/theme";

describe("resolveInitialTheme", () => {
  test("returns cookie value if present", () => {
    expect(resolveInitialTheme({ cookie: "dark", systemPrefersDark: false })).toBe("dark");
    expect(resolveInitialTheme({ cookie: "light", systemPrefersDark: true })).toBe("light");
  });

  test("falls back to system preference if no cookie", () => {
    expect(resolveInitialTheme({ cookie: null, systemPrefersDark: true })).toBe("dark");
    expect(resolveInitialTheme({ cookie: null, systemPrefersDark: false })).toBe("light");
  });
});
