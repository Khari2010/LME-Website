import type { MutationCtx } from "./_generated/server";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Test/dev bypass — same shape as `convex/auth.ts:isTestOrDev`. Keeps the
 * unit tests from blowing through the rate-limit cap when they fire many
 * mutations against `convex-test`. Blocked on prod deployments.
 */
function isTestOrDev(): boolean {
  const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
  if (deployment.startsWith("prod:")) return false;
  return Boolean(process.env.VITEST) || process.env.NODE_ENV === "test";
}

/**
 * Check + increment a rate-limit counter. Throws if the limit is exceeded.
 * Caller passes a key (e.g. `inquiry:foo@example.com`) and a max count for
 * the window (default 5 per hour).
 *
 * Behaviour:
 *   - First call for a key: insert row with count=1, return.
 *   - Subsequent call within window: increment count (or throw if >= max).
 *   - Subsequent call AFTER window expires: reset window, count=1.
 *
 * Honours the test/dev bypass so existing convex-test suites don't trip the
 * limit. Production deployments always enforce.
 */
export async function rateLimit(
  ctx: MutationCtx,
  key: string,
  max: number = 5,
): Promise<void> {
  if (isTestOrDev()) return;

  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (!existing) {
    await ctx.db.insert("rateLimits", { key, count: 1, windowStart: now });
    return;
  }

  if (now - existing.windowStart > WINDOW_MS) {
    // Window expired — reset
    await ctx.db.patch(existing._id, { count: 1, windowStart: now });
    return;
  }

  if (existing.count >= max) {
    throw new Error("Too many requests. Try again in a few minutes.");
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}
