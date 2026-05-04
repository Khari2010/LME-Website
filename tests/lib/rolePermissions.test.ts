import { describe, expect, test } from "vitest";
import { canSeeModule, canWriteModule } from "../../src/lib/role-permissions";

describe("canSeeModule", () => {
  test("director sees everything", () => {
    expect(canSeeModule("director", "external-bookings")).toBe(true);
    expect(canSeeModule("director", "finance")).toBe(true);
    expect(canSeeModule("director", "marketing")).toBe(true);
  });

  test("ticketing only sees Dashboard / Internal Shows / Settings", () => {
    expect(canSeeModule("ticketing", "dashboard")).toBe(true);
    expect(canSeeModule("ticketing", "internal-shows")).toBe(true);
    expect(canSeeModule("ticketing", "settings")).toBe(true);
    expect(canSeeModule("ticketing", "external-bookings")).toBe(false);
    expect(canSeeModule("ticketing", "finance")).toBe(false);
    expect(canSeeModule("ticketing", "marketing")).toBe(false);
  });

  test("no-access only sees Dashboard", () => {
    expect(canSeeModule("no-access", "dashboard")).toBe(true);
    expect(canSeeModule("no-access", "external-bookings")).toBe(false);
  });

  test("legacy owner role maps to director-equivalent", () => {
    expect(canSeeModule("owner", "finance")).toBe(true);
    expect(canSeeModule("owner", "marketing")).toBe(true);
  });
});

describe("canWriteModule", () => {
  test("director can write everywhere", () => {
    expect(canWriteModule("director", "external-bookings")).toBe(true);
    expect(canWriteModule("director", "finance")).toBe(true);
    expect(canWriteModule("director", "marketing")).toBe(true);
  });

  test("admin can write external-bookings but not marketing", () => {
    expect(canWriteModule("admin", "external-bookings")).toBe(true);
    expect(canWriteModule("admin", "marketing")).toBe(false);
    expect(canWriteModule("admin", "finance")).toBe(false);
  });

  test("marketing can write marketing + enhancers but not bookings", () => {
    expect(canWriteModule("marketing", "marketing")).toBe(true);
    expect(canWriteModule("marketing", "enhancers")).toBe(true);
    expect(canWriteModule("marketing", "external-bookings")).toBe(false);
  });

  test("ticketing can't write anywhere (read-only role)", () => {
    expect(canWriteModule("ticketing", "internal-shows")).toBe(false);
    expect(canWriteModule("ticketing", "dashboard")).toBe(false);
  });

  test("no-access can't write anywhere", () => {
    expect(canWriteModule("no-access", "external-bookings")).toBe(false);
  });
});
