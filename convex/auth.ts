import type { QueryCtx, MutationCtx } from "./_generated/server";

export type Role =
  | "director"
  | "admin"
  | "internal-events"
  | "marketing"
  | "production"
  | "ticketing"
  | "owner"
  | "drafter";

const WRITE_ALLOWED: Record<string, ReadonlyArray<Role>> = {
  "external-bookings": ["director", "admin", "owner"],
  "internal-shows": ["director", "internal-events", "owner"],
  "team-diary": ["director", "internal-events", "owner"],
  "marketing": ["director", "marketing", "owner"],
  "music": ["director", "owner"],
  "finance": ["director", "owner"],
  "enhancers": ["director", "marketing", "owner"],
  "settings": ["director", "owner"],
};

/**
 * Test/dev bypass for auth gates. Returns true ONLY when:
 *   - we're NOT running on a Convex production deployment, AND
 *   - we're inside vitest or NODE_ENV=test.
 *
 * Convex sets `CONVEX_DEPLOYMENT` to e.g. "prod:lpwing-xyz", "dev:abc",
 * or "anonymous:xyz". By blocking the bypass when prefix is `prod:`, we
 * stop a stray VITEST=true env var from disabling auth in production.
 */
function isTestOrDev(): boolean {
  const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
  if (deployment.startsWith("prod:")) return false;
  return Boolean(process.env.VITEST) || process.env.NODE_ENV === "test";
}

/**
 * Read the current user's role from the auth identity → Convex users row.
 * Returns null if no user is signed in OR the Convex row hasn't been created
 * yet (the Clerk webhook upserts it asynchronously).
 */
export async function getCurrentRole(ctx: QueryCtx | MutationCtx): Promise<Role | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // Clerk subjects look like "user_xxx" — match against users.clerkUserId
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  return (user?.role as Role | undefined) ?? null;
}

/**
 * Throws if the current user can't write to the given module.
 * Use at the top of mutations that should be role-gated.
 *
 * Phase 5 enforcement: only mutations that mutate data (NOT queries) should
 * call this. The Sidebar handles read-side visibility.
 */
export async function requireWrite(
  ctx: MutationCtx,
  mod: keyof typeof WRITE_ALLOWED,
): Promise<void> {
  // Test environments don't run with Clerk identities — let convex-test
  // exercise the mutations without forcing every test to seed an authed user.
  // `isTestOrDev` blocks this bypass on prod Convex deployments.
  if (isTestOrDev()) return;

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to continue.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!user) {
    throw new Error(
      "Your account is being set up — refresh in a few seconds. If this persists, ask an admin to check the Clerk webhook.",
    );
  }
  const role = (user.role as Role | undefined) ?? null;
  const allowed = WRITE_ALLOWED[mod] as ReadonlyArray<string>;
  if (!role || !allowed.includes(role)) {
    throw new Error(
      `Your role (${role ?? "no-access"}) doesn't have write access to "${mod}".`,
    );
  }
}

/**
 * Throws if the current user isn't authenticated (no Clerk identity OR no
 * Convex `users` row). Use at the top of every admin-facing query so anyone
 * with the public Convex URL can't dump data unauthenticated. Test bypass
 * via `isTestOrDev()`.
 *
 * Note: this is read-only; we don't check role here. Sidebar visibility plus
 * the role-aware write gates (`requireWrite`) handle authorization. The point
 * of `requireAuth` is to block the unauthenticated public from reading
 * contact PII / finance / event details.
 */
export async function requireAuth(ctx: QueryCtx): Promise<void> {
  if (isTestOrDev()) return;
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to continue.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!user) {
    throw new Error(
      "Your account is being set up — refresh in a few seconds. If this persists, ask an admin to check the Clerk webhook.",
    );
  }
}
