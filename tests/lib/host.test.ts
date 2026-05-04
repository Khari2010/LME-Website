import { describe, expect, test } from "vitest";
import { isAppHost, isPublicHost } from "../../src/lib/host";

describe("host helpers", () => {
  test("isAppHost matches app.lmeband.com", () => {
    expect(isAppHost("app.lmeband.com")).toBe(true);
    expect(isAppHost("app.lmeband.com:443")).toBe(true);
    expect(isAppHost("lmeband.com")).toBe(false);
    expect(isAppHost("www.lmeband.com")).toBe(false);
  });

  test("isPublicHost matches root + www", () => {
    expect(isPublicHost("lmeband.com")).toBe(true);
    expect(isPublicHost("www.lmeband.com")).toBe(true);
    expect(isPublicHost("app.lmeband.com")).toBe(false);
  });

  test("dev hosts treated as app when env var set", () => {
    process.env.NEXT_PUBLIC_LOCAL_APP_HOST = "app.localhost:3002";
    expect(isAppHost("app.localhost:3002")).toBe(true);
    delete process.env.NEXT_PUBLIC_LOCAL_APP_HOST;
  });

  test("isAppHost matches future domain alternatives", () => {
    expect(isAppHost("app.lme.band")).toBe(true);
    expect(isAppHost("lmeband.app")).toBe(true);
  });

  test("isPublicHost matches lme.band variants", () => {
    expect(isPublicHost("lme.band")).toBe(true);
    expect(isPublicHost("www.lme.band")).toBe(true);
  });
});
