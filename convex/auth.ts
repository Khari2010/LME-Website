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
  const role = await getCurrentRole(ctx);
  if (!role) throw new Error("not authenticated");
  const allowed = WRITE_ALLOWED[mod] as ReadonlyArray<string>;
  if (!allowed.includes(role)) {
    throw new Error(`forbidden: role "${role}" cannot write to "${mod}"`);
  }
}
