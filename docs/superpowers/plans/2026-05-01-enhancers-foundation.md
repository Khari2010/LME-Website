# Enhancers Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship sub-project #1a — Convex + Clerk infrastructure, magic-link auth for fans, gated `/enhancers` content area, and `/admin` shell — so Khari and Chris can log in from day one and the foundations are in place for sub-projects #1b through #5.

**Architecture:** Convex as the canonical data layer (with all reserved schemas defined now to avoid future rewrites). Clerk handles `/admin` auth. Custom HMAC-signed magic-link cookies handle `/enhancers` auth. React Email + Resend handle transactional emails. A single `proxy.ts` at the project root gates both surfaces.

**Tech Stack:** Next.js 16 (App Router) · Tailwind CSS 4 · Convex · Clerk · React Email · Resend · TypeScript · `jose` for HMAC

---

## File Structure

**New files:**

```
convex/
  schema.ts                        — all table definitions
  contacts.ts                      — signup, login, redeemMagicLink mutations + dashboard queries
  posts.ts                         — getPublishedPosts, getPostBySlug
  emails.ts                        — sendEnhancerWelcomeEmail action (calls Resend)
  auth.config.ts                   — Clerk JWT verification config

src/
  lib/
    enhancers/
      session.ts                   — HMAC sign/verify session cookie
      tokens.ts                    — UUID token generation + expiry validation
    convex/
      server.ts                    — server-side Convex client (fetchQuery / fetchMutation wrappers)
  components/
    enhancers/
      SignupCard.tsx               — email signup form (client component)
      LoginForm.tsx                — request-new-link form (client component)
      PostCard.tsx                 — grid card
      PostFeatured.tsx             — hero featured post
    admin/
      AdminShell.tsx               — sidebar + page chrome
      AdminDashboard.tsx           — counts + recent signups
  emails/
    EnhancerWelcome.tsx            — React Email template (used for both signup welcome & returning login)
  app/
    enhancers/
      page.tsx                     — gated landing (featured + grid)
      login/page.tsx               — request a magic link
      check-email/page.tsx         — "check your inbox" confirmation
      auth/route.ts                — GET handler: redeem token, set cookie, redirect
      logout/route.ts              — POST handler: clear cookie
      posts/[slug]/page.tsx        — gated post detail
    admin/
      layout.tsx                   — Clerk-aware layout
      page.tsx                     — dashboard
      sign-in/[[...sign-in]]/page.tsx — Clerk sign-in
  middleware.ts → proxy.ts         — auth gate for /enhancers/* and /admin/*

tests/
  enhancers/
    session.test.ts                — HMAC sign/verify
    tokens.test.ts                 — token generation + expiry
  convex/
    contacts.test.ts               — mutation behaviour with convex-test

scripts/
  seed-enhancer-posts.ts           — populate Convex with 3 starter posts
```

**Modified files:**

- `package.json` — new dependencies
- `src/app/page.tsx` — insert SignupCard band in hero
- `src/app/layout.tsx` — wrap with `ConvexProviderWithClerk`
- `src/components/sections/` — add a footer signup section (likely a new `EnhancersFooterCTA.tsx` and inclusion)
- `.env.example` — document new env vars

**Untouched (no regressions):**

- `src/app/bookingform/**`
- `src/app/api/submit/route.ts`
- `src/app/api/booking/[token]/route.ts`
- `src/lib/notion.ts`
- `src/lib/booking-types.ts`

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add convex @clerk/nextjs @clerk/backend jose @react-email/components
```

- [ ] **Step 2: Install Resend client (if not already present)**

```bash
pnpm list resend || pnpm add resend
```

- [ ] **Step 3: Install dev dependencies**

```bash
pnpm add -D convex-test @types/node
```

- [ ] **Step 4: Verify install**

```bash
pnpm install
pnpm exec tsc --noEmit
```

Expected: clean type-check (existing code still compiles).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add Convex, Clerk, React Email, jose deps for #1a"
```

---

## Task 2: Initialize Convex project

**Files:**
- Create: `convex/_generated/` (auto-generated)
- Create: `convex/auth.config.ts`
- Modify: `.env.example`
- Modify: `.gitignore` (if not already ignoring `.env.local`)

- [ ] **Step 1: Run Convex init**

```bash
pnpm dlx convex dev --once --configure=new
```

When prompted, name the project `lme-platform` (matches the LME platform direction).

This creates `convex/` directory with `_generated/` types, sets `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOY_KEY` in `.env.local`.

- [ ] **Step 2: Document env vars in `.env.example`**

```bash
# Add to existing file, do not overwrite
cat >> .env.example <<'EOF'

# Convex
NEXT_PUBLIC_CONVEX_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Magic-link session
ENHANCERS_SESSION_SECRET=

# Email
ENHANCERS_FROM_ADDRESS=enhancers@lmeband.com
EOF
```

- [ ] **Step 3: Generate the session secret**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the output to `.env.local` as `ENHANCERS_SESSION_SECRET=<value>`.

- [ ] **Step 4: Commit**

```bash
git add convex/ .env.example .gitignore
git commit -m "chore: initialize Convex project for LME platform"
```

---

## Task 3: Set up Clerk (Vercel Marketplace)

**Files:**
- Create: `src/app/admin/sign-in/[[...sign-in]]/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Install Clerk via Vercel Marketplace**

In a browser: Vercel dashboard → LME-Website project → Integrations → Marketplace → Clerk → Install. Follow prompts to create a new Clerk application named "LME Platform". This auto-provisions `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel env vars.

- [ ] **Step 2: Pull Vercel env to local**

```bash
pnpm dlx vercel env pull .env.local
```

Verify `.env.local` now has the Clerk keys.

- [ ] **Step 3: Create Clerk Organization**

In Clerk dashboard (`dashboard.clerk.com`): Organizations → Create Organization → name "LME Band". Add roles: `admin`, `viewer`. Invite Khari (admin) and Chris (admin) by email.

- [ ] **Step 4: Wrap root layout with Clerk + Convex providers**

Modify `src/app/layout.tsx`:

```tsx
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/lib/convex/ConvexClientProvider";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 5: Create the Convex client provider**

Create `src/lib/convex/ConvexClientProvider.tsx`:

```tsx
"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
```

- [ ] **Step 6: Configure Convex to trust Clerk JWTs**

Create `convex/auth.config.ts`:

```ts
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

In Clerk dashboard: JWT Templates → New Template → name "convex" → leave defaults. Copy the issuer URL (e.g. `https://your-app.clerk.accounts.dev`) and add to `.env.local` and Vercel env as `CLERK_JWT_ISSUER_DOMAIN`. Also add to `convex env set CLERK_JWT_ISSUER_DOMAIN <value>`.

- [ ] **Step 7: Create Clerk sign-in page**

Create `src/app/admin/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <SignIn path="/admin/sign-in" routing="path" signUpUrl="/admin/sign-in" />
    </div>
  );
}
```

- [ ] **Step 8: Verify dev server starts**

```bash
pnpm dev
```

In a new terminal:
```bash
pnpm dlx convex dev
```

Visit `http://localhost:3000/admin/sign-in`. Expected: Clerk's sign-in UI renders.

- [ ] **Step 9: Commit**

```bash
git add src/app/layout.tsx src/lib/convex/ConvexClientProvider.tsx convex/auth.config.ts src/app/admin/sign-in/
git commit -m "feat: integrate Clerk auth with Convex provider for /admin"
```

---

## Task 4: Define Convex schema (all tables: active + reserved)

**Files:**
- Create: `convex/schema.ts`

- [ ] **Step 1: Write the schema**

Create `convex/schema.ts`:

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ===== Active in #1a =====

  contacts: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    source: v.union(
      v.literal("enhancers-signup"),
      v.literal("booking-inquiry"),
      v.literal("manual"),
    ),
    tags: v.array(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("unsubscribed"),
      v.literal("bounced"),
    ),
    signupDate: v.number(),
    lastActive: v.optional(v.number()),
    magicLinkToken: v.optional(v.string()),
    magicLinkIssuedAt: v.optional(v.number()),
    ageRange: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_magic_token", ["magicLinkToken"]),

  posts: defineTable({
    title: v.string(),
    slug: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    type: v.union(
      v.literal("post"),
      v.literal("mix"),
      v.literal("listen-link"),
      v.literal("feedback-request"),
    ),
    featured: v.boolean(),
    publishedDate: v.optional(v.number()),
    heroImageUrl: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    bodyHtml: v.string(),
    embedUrls: v.array(v.string()),
    campaignId: v.optional(v.id("campaigns")),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_date", ["status", "publishedDate"]),

  // ===== Reserved — populated in later sub-projects =====

  campaigns: defineTable({
    subjectLine: v.string(),
    sentDate: v.number(),
    sentBy: v.string(),
    recipientCount: v.number(),
    recipientTags: v.array(v.string()),
    bodyHtml: v.string(),
    resendMessageId: v.optional(v.string()),
    linkedPostId: v.optional(v.id("posts")),
  }),

  assets: defineTable({
    type: v.union(v.literal("photo"), v.literal("audio"), v.literal("video")),
    dropboxPath: v.optional(v.string()),
    cdnUrl: v.string(),
    caption: v.optional(v.string()),
    tags: v.array(v.string()),
    event: v.optional(v.string()),
    date: v.optional(v.number()),
    externalUrl: v.optional(v.string()),
  }),

  bookings: defineTable({
    clientName: v.string(),
    clientEmail: v.string(),
    clientPhone: v.optional(v.string()),
    eventType: v.union(
      v.literal("wedding"),
      v.literal("corporate"),
      v.literal("private-party"),
      v.literal("festival"),
      v.literal("other"),
    ),
    eventDate: v.number(),
    venue: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    expectedGuests: v.optional(v.number()),
    genres: v.array(v.string()),
    djRequired: v.boolean(),
    status: v.union(
      v.literal("enquiry"),
      v.literal("quoted"),
      v.literal("contract-sent"),
      v.literal("deposit-paid"),
      v.literal("booked"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    fee: v.optional(v.number()),
    depositPaid: v.boolean(),
    leadSource: v.optional(v.string()),
    notes: v.optional(v.string()),
    editToken: v.string(),
    detailsBlob: v.optional(v.any()),
    contactId: v.optional(v.id("contacts")),
  })
    .index("by_edit_token", ["editToken"])
    .index("by_status_and_date", ["status", "eventDate"]),

  tasks: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("not-started"),
      v.literal("waiting-to-start"),
      v.literal("in-progress"),
      v.literal("waiting-for-feedback"),
      v.literal("done"),
      v.literal("delay"),
      v.literal("cancelled"),
    ),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    tags: v.array(v.string()),
    dueDate: v.optional(v.number()),
    assigneeUserId: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  }),

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.array(v.string()),
    priority: v.optional(v.string()),
    dueDate: v.optional(v.number()),
  }),

  events: defineTable({
    title: v.string(),
    start: v.number(),
    end: v.optional(v.number()),
    details: v.optional(v.string()),
    url: v.optional(v.string()),
    type: v.union(
      v.literal("rehearsal"),
      v.literal("meeting"),
      v.literal("gig"),
      v.literal("other"),
    ),
  }),

  discussions: defineTable({
    title: v.string(),
    category: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("archived"),
    ),
    members: v.array(v.string()),
    lastActivity: v.number(),
    bookingId: v.optional(v.id("bookings")),
    taskId: v.optional(v.id("tasks")),
    projectId: v.optional(v.id("projects")),
  }),

  messages: defineTable({
    discussionId: v.id("discussions"),
    authorUserId: v.string(),
    bodyHtml: v.string(),
    createdAt: v.number(),
  }).index("by_discussion", ["discussionId", "createdAt"]),
});
```

- [ ] **Step 2: Push schema to Convex**

```bash
pnpm dlx convex dev --once
```

Expected: schema applies successfully, `convex/_generated/dataModel.d.ts` updates.

- [ ] **Step 3: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/_generated/
git commit -m "feat: define Convex schema with active and reserved tables"
```

---

## Task 5: HMAC session cookie helper (TDD)

**Files:**
- Create: `src/lib/enhancers/session.ts`
- Test: `tests/enhancers/session.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/enhancers/session.test.ts`:

```ts
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
```

- [ ] **Step 2: Verify the tests fail**

```bash
pnpm exec vitest run tests/enhancers/session.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the session helper**

Create `src/lib/enhancers/session.ts`:

```ts
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "enh_session";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 days

function getSecret(): Uint8Array {
  const raw = process.env.ENHANCERS_SESSION_SECRET;
  if (!raw) throw new Error("ENHANCERS_SESSION_SECRET not set");
  return new TextEncoder().encode(raw);
}

export async function signSession(
  contactId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return await new SignJWT({ sub: contactId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ["HS256"],
  });
  if (typeof payload.sub !== "string") {
    throw new Error("Invalid session payload");
  }
  return payload.sub;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = DEFAULT_TTL_SECONDS;
```

- [ ] **Step 4: Verify the tests pass**

```bash
pnpm exec vitest run tests/enhancers/session.test.ts
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/enhancers/session.ts tests/enhancers/session.test.ts
git commit -m "feat: HMAC-signed Enhancers session cookie helper"
```

---

## Task 6: Magic-link token helpers (TDD)

**Files:**
- Create: `src/lib/enhancers/tokens.ts`
- Test: `tests/enhancers/tokens.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/enhancers/tokens.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
pnpm exec vitest run tests/enhancers/tokens.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/enhancers/tokens.ts`:

```ts
import { randomUUID } from "crypto";

export const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateMagicToken(): string {
  return randomUUID();
}

export function isTokenExpired(issuedAtMs: number, now: number = Date.now()): boolean {
  return now - issuedAtMs >= MAGIC_LINK_TTL_MS;
}
```

- [ ] **Step 4: Verify tests pass**

```bash
pnpm exec vitest run tests/enhancers/tokens.test.ts
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/enhancers/tokens.ts tests/enhancers/tokens.test.ts
git commit -m "feat: magic-link token generation + expiry helpers"
```

---

## Task 7: Convex contacts mutations (signup, login, redeem)

**Files:**
- Create: `convex/contacts.ts`
- Test: `tests/convex/contacts.test.ts`

- [ ] **Step 1: Write the contacts mutations**

Create `convex/contacts.ts`:

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  // crypto.randomUUID is available in Convex runtime
  return crypto.randomUUID();
}

export const signupOrLogin = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalised = email.trim().toLowerCase();
    if (!normalised.includes("@")) {
      throw new Error("Invalid email");
    }

    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", normalised))
      .first();

    const token = generateToken();
    const now = Date.now();

    let contactId;
    if (!existing) {
      contactId = await ctx.db.insert("contacts", {
        email: normalised,
        source: "enhancers-signup",
        tags: ["enhancer"],
        status: "active",
        signupDate: now,
        magicLinkToken: token,
        magicLinkIssuedAt: now,
      });
    } else {
      contactId = existing._id;
      await ctx.db.patch(contactId, {
        status: "active",
        magicLinkToken: token,
        magicLinkIssuedAt: now,
      });
    }

    // Schedule the welcome email (run via the email action; no inline await)
    await ctx.scheduler.runAfter(0, "emails:sendEnhancerWelcomeEmail" as any, {
      contactId,
      token,
      isNewSignup: !existing,
    });

    return { ok: true };
  },
});

export const redeemMagicLink = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_magic_token", (q) => q.eq("magicLinkToken", token))
      .first();

    if (!contact || !contact.magicLinkIssuedAt) {
      throw new Error("Invalid or expired link");
    }

    if (Date.now() - contact.magicLinkIssuedAt >= MAGIC_LINK_TTL_MS) {
      throw new Error("Link expired");
    }

    await ctx.db.patch(contact._id, {
      magicLinkToken: undefined,
      lastActive: Date.now(),
    });

    return { contactId: contact._id };
  },
});

export const getContactById = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, { id }): Promise<Doc<"contacts"> | null> => {
    return await ctx.db.get(id);
  },
});

export const getEnhancersDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("contacts").collect();
    const active = all.filter((c) => c.status === "active");
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      total: active.length,
      last7: active.filter((c) => c.signupDate >= sevenDaysAgo).length,
      last30: active.filter((c) => c.signupDate >= thirtyDaysAgo).length,
    };
  },
});

export const getRecentSignups = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const all = await ctx.db.query("contacts").order("desc").take(limit ?? 10);
    return all.map((c) => ({
      _id: c._id,
      email: c.email,
      name: c.name,
      signupDate: c.signupDate,
      status: c.status,
    }));
  },
});
```

- [ ] **Step 2: Push to Convex**

```bash
pnpm dlx convex dev --once
```

Expected: functions deploy successfully.

- [ ] **Step 3: Write convex-test for the mutations**

Create `tests/convex/contacts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

describe("contacts mutations", () => {
  it("creates a new contact on first signup", async () => {
    const t = convexTest(schema);
    await t.mutation(api.contacts.signupOrLogin, { email: "fan@example.com" });
    const stats = await t.query(api.contacts.getEnhancersDashboardStats, {});
    expect(stats.total).toBe(1);
  });

  it("re-issues a token for an existing contact", async () => {
    const t = convexTest(schema);
    await t.mutation(api.contacts.signupOrLogin, { email: "fan@example.com" });
    await t.mutation(api.contacts.signupOrLogin, { email: "fan@example.com" });
    const stats = await t.query(api.contacts.getEnhancersDashboardStats, {});
    expect(stats.total).toBe(1);
  });

  it("normalises email to lowercase", async () => {
    const t = convexTest(schema);
    await t.mutation(api.contacts.signupOrLogin, { email: "Fan@Example.com" });
    await t.mutation(api.contacts.signupOrLogin, { email: "FAN@example.com" });
    const stats = await t.query(api.contacts.getEnhancersDashboardStats, {});
    expect(stats.total).toBe(1);
  });

  it("rejects an obvious bad email", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(api.contacts.signupOrLogin, { email: "notanemail" }),
    ).rejects.toThrow();
  });

  it("rejects an unknown magic-link token", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(api.contacts.redeemMagicLink, { token: "00000000-0000-0000-0000-000000000000" }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm exec vitest run tests/convex/contacts.test.ts
```

Expected: 5 passing. (Note: the email scheduler call is mocked-out in convex-test; we don't assert on it here.)

- [ ] **Step 5: Commit**

```bash
git add convex/contacts.ts tests/convex/contacts.test.ts
git commit -m "feat: Convex contact mutations for signup, login, redeem"
```

---

## Task 8: React Email welcome template

**Files:**
- Create: `src/emails/EnhancerWelcome.tsx`

- [ ] **Step 1: Build the template**

Create `src/emails/EnhancerWelcome.tsx`:

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface Props {
  magicLinkUrl: string;
  isNewSignup: boolean;
}

const brand = {
  bg: "#0a0a0a",
  text: "#ffffff",
  muted: "#9ca3af",
  accent: "#14b8a6", // teal
  border: "#1f2937",
};

export default function EnhancerWelcome({ magicLinkUrl, isNewSignup }: Props) {
  const headline = isNewSignup ? "You're in." : "Welcome back.";
  const intro = isNewSignup
    ? "You just joined the Enhancers — LME's private community. Click below to unlock exclusive content, mixes and behind-the-scenes."
    : "Click the button below to access your Enhancers area.";
  const preview = isNewSignup
    ? "You're in. One tap to unlock the Enhancers area."
    : "One tap to access your Enhancers area.";

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: brand.bg, color: brand.text, fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Section>
            <Text style={{ color: brand.accent, fontSize: 14, letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>
              LME · Enhancers
            </Text>
          </Section>
          <Section style={{ paddingTop: 24 }}>
            <Heading as="h1" style={{ color: brand.text, fontSize: 36, fontWeight: 700, margin: 0 }}>
              {headline}
            </Heading>
            <Text style={{ color: brand.muted, fontSize: 16, lineHeight: 1.6, paddingTop: 12 }}>
              {intro}
            </Text>
          </Section>
          <Section style={{ paddingTop: 32 }}>
            <Button
              href={magicLinkUrl}
              style={{
                backgroundColor: brand.accent,
                color: "#0a0a0a",
                padding: "16px 32px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Open my Enhancers area
            </Button>
            <Text style={{ color: brand.muted, fontSize: 12, paddingTop: 16 }}>
              Or paste this link: <Link href={magicLinkUrl} style={{ color: brand.accent }}>{magicLinkUrl}</Link>
            </Text>
            <Text style={{ color: brand.muted, fontSize: 12 }}>
              This link expires in 7 days and can only be used once.
            </Text>
          </Section>
          <Hr style={{ borderColor: brand.border, margin: "40px 0 16px" }} />
          <Section>
            <Text style={{ color: brand.muted, fontSize: 11, lineHeight: 1.6 }}>
              You're getting this because you signed up to the Enhancers at lmeband.com.
              <br />
              <Link href="https://lmeband.com" style={{ color: brand.muted }}>lmeband.com</Link>
              {" · "}
              <Link href="https://instagram.com/lme.band" style={{ color: brand.muted }}>Instagram</Link>
              {" · "}
              <Link href="https://youtube.com/@livemusicenhancers" style={{ color: brand.muted }}>YouTube</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/emails/EnhancerWelcome.tsx
git commit -m "feat: React Email welcome/login template"
```

---

## Task 9: Convex email-sending action

**Files:**
- Create: `convex/emails.ts`

- [ ] **Step 1: Write the action**

Create `convex/emails.ts`:

```ts
"use node";

import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import EnhancerWelcome from "../src/emails/EnhancerWelcome";
import React from "react";

export const sendEnhancerWelcomeEmail = action({
  args: {
    contactId: v.id("contacts"),
    token: v.string(),
    isNewSignup: v.boolean(),
  },
  handler: async (ctx, { contactId, token, isNewSignup }) => {
    const contact = await ctx.runQuery(
      // @ts-expect-error: cross-module reference
      "contacts:getContactById",
      { id: contactId },
    );
    if (!contact) {
      throw new Error("Contact not found");
    }

    const baseUrl = process.env.SITE_URL ?? "https://lmeband.com";
    const magicLinkUrl = `${baseUrl}/enhancers/auth?token=${token}`;

    const html = await render(
      React.createElement(EnhancerWelcome, { magicLinkUrl, isNewSignup }),
    );

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.ENHANCERS_FROM_ADDRESS ?? "enhancers@lmeband.com";
    if (!apiKey) throw new Error("RESEND_API_KEY not set");

    const resend = new Resend(apiKey);
    const subject = isNewSignup ? "You're in — welcome to the Enhancers" : "Your Enhancers link";

    const result = await resend.emails.send({
      from: `LME Enhancers <${fromAddress}>`,
      to: [contact.email],
      subject,
      html,
    });

    if (result.error) {
      throw new Error(`Resend error: ${result.error.message}`);
    }

    return { messageId: result.data?.id };
  },
});
```

- [ ] **Step 2: Set Convex env vars for the email action**

```bash
pnpm dlx convex env set RESEND_API_KEY <your-resend-key>
pnpm dlx convex env set SITE_URL https://lmeband.com
pnpm dlx convex env set ENHANCERS_FROM_ADDRESS enhancers@lmeband.com
```

- [ ] **Step 3: Push to Convex**

```bash
pnpm dlx convex dev --once
```

- [ ] **Step 4: Verify the Resend domain is configured**

In Resend dashboard: Domains → ensure `lmeband.com` (or sub-sender `enhancers.lmeband.com`) is verified for sending. If not, follow Resend's SPF/DKIM setup before continuing.

- [ ] **Step 5: Manual smoke test**

Open the Convex dashboard → Functions → `emails:sendEnhancerWelcomeEmail` → "Run". Provide a test `contactId` (from a fan you manually created via `signupOrLogin`) and a token. Verify the email arrives.

- [ ] **Step 6: Commit**

```bash
git add convex/emails.ts
git commit -m "feat: Convex action to send Enhancer welcome email via Resend"
```

---

## Task 10: SignupCard component

**Files:**
- Create: `src/components/enhancers/SignupCard.tsx`

- [ ] **Step 1: Build the client component**

Create `src/components/enhancers/SignupCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface Props {
  variant?: "hero" | "footer";
}

export default function SignupCard({ variant = "hero" }: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signupOrLogin = useMutation(api.contacts.signupOrLogin);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signupOrLogin({ email });
      setDone(true);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className={variant === "hero" ? "py-8" : "py-12"}>
        <p className="text-teal-400 text-sm uppercase tracking-widest">Check your inbox</p>
        <p className="text-white mt-2">We just sent you a link to unlock the Enhancers area.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={variant === "hero" ? "py-6" : "py-12"}>
      <p className="text-teal-400 text-xs uppercase tracking-widest mb-3">
        Become an Enhancer
      </p>
      <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">
        Exclusive content. Straight to your inbox.
      </h3>
      <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
        <label htmlFor={`enh-email-${variant}`} className="sr-only">Email</label>
        <input
          id={`enh-email-${variant}`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 bg-black border border-gray-700 text-white px-4 py-3 rounded focus:outline-none focus:border-teal-400"
        />
        <button
          type="submit"
          disabled={submitting || !email}
          className="bg-teal-400 text-black px-6 py-3 rounded font-bold uppercase tracking-wider hover:bg-teal-300 disabled:opacity-50 transition"
        >
          {submitting ? "Sending…" : "Sign me up"}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/enhancers/SignupCard.tsx
git commit -m "feat: SignupCard component for Enhancers signup"
```

---

## Task 11: Insert SignupCard into homepage and footer

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/sections/EnhancersFooterCTA.tsx`

- [ ] **Step 1: Read the current homepage**

```bash
cat src/app/page.tsx
```

- [ ] **Step 2: Identify where the hero ends**

Open `src/app/page.tsx` and locate the `<Hero />` section import and placement. The SignupCard band goes immediately under the hero.

- [ ] **Step 3: Add the hero band**

Modify `src/app/page.tsx` — add an import and place the band:

```tsx
import SignupCard from "@/components/enhancers/SignupCard";
// ...existing imports

// In the JSX, immediately under <Hero />:
<section className="bg-black border-t border-b border-gray-900 px-6 md:px-12 lg:px-24">
  <SignupCard variant="hero" />
</section>
```

- [ ] **Step 4: Build the footer CTA section**

Create `src/components/sections/EnhancersFooterCTA.tsx`:

```tsx
import SignupCard from "@/components/enhancers/SignupCard";

export default function EnhancersFooterCTA() {
  return (
    <section className="bg-black px-6 md:px-12 lg:px-24 border-t border-gray-900">
      <div className="max-w-4xl mx-auto">
        <SignupCard variant="footer" />
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Place the footer CTA in the homepage**

In `src/app/page.tsx`, add the EnhancersFooterCTA below the existing footer-area sections (e.g. after `<Book />` or before the global footer):

```tsx
import EnhancersFooterCTA from "@/components/sections/EnhancersFooterCTA";

// In the JSX, near the bottom of the page:
<EnhancersFooterCTA />
```

- [ ] **Step 6: Visual smoke test**

```bash
pnpm dev
```

In one tab visit `http://localhost:3000`. Confirm the hero band and the footer band both render. Submit a test email; confirm the form transitions to the "check your inbox" state.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components/sections/EnhancersFooterCTA.tsx
git commit -m "feat: insert Enhancers signup into homepage hero and footer"
```

---

## Task 12: Login page (request a magic link)

**Files:**
- Create: `src/app/enhancers/login/page.tsx`
- Create: `src/components/enhancers/LoginForm.tsx`

- [ ] **Step 1: Build the login form (reuses the signup mutation)**

Create `src/components/enhancers/LoginForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signupOrLogin = useMutation(api.contacts.signupOrLogin);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signupOrLogin({ email });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-teal-400 uppercase tracking-widest text-sm">Check your inbox</p>
        <p className="text-white mt-2">A new link is on its way to {email}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label htmlFor="enh-login-email" className="block text-sm text-gray-400 uppercase tracking-widest">
        Email
      </label>
      <input
        id="enh-login-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full bg-black border border-gray-700 text-white px-4 py-3 rounded focus:outline-none focus:border-teal-400"
      />
      <button
        type="submit"
        disabled={submitting || !email}
        className="w-full bg-teal-400 text-black px-6 py-3 rounded font-bold uppercase tracking-wider hover:bg-teal-300 disabled:opacity-50 transition"
      >
        {submitting ? "Sending…" : "Send me a link"}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Build the login page**

Create `src/app/enhancers/login/page.tsx`:

```tsx
import LoginForm from "@/components/enhancers/LoginForm";

export const metadata = {
  title: "Enhancers · Sign in",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <p className="text-teal-400 uppercase tracking-widest text-sm">LME · Enhancers</p>
        <h1 className="text-white text-3xl font-bold mt-2 mb-6">Welcome back.</h1>
        <p className="text-gray-400 mb-8">
          Enter your email and we'll send you a one-tap link to your Enhancers area.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual test**

Visit `http://localhost:3000/enhancers/login`. Submit an email. Confirm the success state appears.

- [ ] **Step 4: Commit**

```bash
git add src/app/enhancers/login/page.tsx src/components/enhancers/LoginForm.tsx
git commit -m "feat: /enhancers/login page for requesting magic links"
```

---

## Task 13: check-email confirmation page

**Files:**
- Create: `src/app/enhancers/check-email/page.tsx`

- [ ] **Step 1: Build the page**

Create `src/app/enhancers/check-email/page.tsx`:

```tsx
export const metadata = {
  title: "Enhancers · Check your inbox",
};

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <p className="text-teal-400 uppercase tracking-widest text-sm">LME · Enhancers</p>
        <h1 className="text-white text-3xl font-bold mt-2 mb-6">Check your inbox.</h1>
        <p className="text-gray-400">
          We just sent you a one-tap link. It expires in 7 days. If you don't see it, check spam.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/enhancers/check-email/page.tsx
git commit -m "feat: /enhancers/check-email confirmation page"
```

---

## Task 14: Magic-link redemption route

**Files:**
- Create: `src/app/enhancers/auth/route.ts`

- [ ] **Step 1: Build the route handler**

Create `src/app/enhancers/auth/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { signSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/enhancers/session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/enhancers/login?error=missing", req.url));
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let contactId: string;
  try {
    const result = await convex.mutation(api.contacts.redeemMagicLink, { token });
    contactId = result.contactId;
  } catch {
    return NextResponse.redirect(new URL("/enhancers/login?error=invalid", req.url));
  }

  const cookie = await signSession(contactId);
  const response = NextResponse.redirect(new URL("/enhancers", req.url));
  response.cookies.set(SESSION_COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
```

- [ ] **Step 2: Manual test (with a known token)**

Trigger a signup, look up the issued token in the Convex dashboard's `contacts` table, then visit:
`http://localhost:3000/enhancers/auth?token=<that-token>`

Expected: redirect to `/enhancers`. The `enh_session` cookie is set.

- [ ] **Step 3: Test invalid token**

Visit `http://localhost:3000/enhancers/auth?token=00000000-0000-0000-0000-000000000000`.
Expected: redirect to `/enhancers/login?error=invalid`.

- [ ] **Step 4: Commit**

```bash
git add src/app/enhancers/auth/route.ts
git commit -m "feat: /enhancers/auth magic-link redemption route"
```

---

## Task 15: Logout route

**Files:**
- Create: `src/app/enhancers/logout/route.ts`

- [ ] **Step 1: Build it**

Create `src/app/enhancers/logout/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/enhancers/session";

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/", req.url));
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
```

- [ ] **Step 2: Manual test**

```bash
curl -i -X POST http://localhost:3000/enhancers/logout
```

Expected: 307 redirect, `Set-Cookie: enh_session=; Max-Age=0; Path=/`.

- [ ] **Step 3: Commit**

```bash
git add src/app/enhancers/logout/route.ts
git commit -m "feat: /enhancers/logout route"
```

---

## Task 16: Convex posts queries

**Files:**
- Create: `convex/posts.ts`

- [ ] **Step 1: Write the queries**

Create `convex/posts.ts`:

```ts
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getPublishedPosts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const all = await ctx.db
      .query("posts")
      .withIndex("by_status_and_date", (q) => q.eq("status", "published"))
      .order("desc")
      .take(limit ?? 12);
    return all;
  },
});

export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});
```

- [ ] **Step 2: Push to Convex**

```bash
pnpm dlx convex dev --once
```

- [ ] **Step 3: Commit**

```bash
git add convex/posts.ts
git commit -m "feat: Convex queries for published posts and post-by-slug"
```

---

## Task 17: Post grid components

**Files:**
- Create: `src/components/enhancers/PostFeatured.tsx`
- Create: `src/components/enhancers/PostCard.tsx`

- [ ] **Step 1: Build the featured component**

Create `src/components/enhancers/PostFeatured.tsx`:

```tsx
import Link from "next/link";
import type { Doc } from "../../../convex/_generated/dataModel";

export default function PostFeatured({ post }: { post: Doc<"posts"> }) {
  return (
    <Link href={`/enhancers/posts/${post.slug}`} className="block group">
      <article className="relative overflow-hidden rounded-lg bg-gray-900">
        {post.heroImageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={post.heroImageUrl}
            alt=""
            className="w-full aspect-[16/9] object-cover group-hover:scale-105 transition duration-700"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <p className="text-teal-400 text-xs uppercase tracking-widest mb-2">Latest drop</p>
          <h2 className="text-white text-3xl md:text-4xl font-bold">{post.title}</h2>
        </div>
      </article>
    </Link>
  );
}
```

- [ ] **Step 2: Build the card component**

Create `src/components/enhancers/PostCard.tsx`:

```tsx
import Link from "next/link";
import type { Doc } from "../../../convex/_generated/dataModel";

export default function PostCard({ post }: { post: Doc<"posts"> }) {
  return (
    <Link href={`/enhancers/posts/${post.slug}`} className="block group">
      <article className="rounded-lg bg-gray-900 overflow-hidden">
        {post.heroImageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={post.heroImageUrl}
            alt=""
            className="w-full aspect-video object-cover group-hover:scale-105 transition duration-500"
          />
        )}
        <div className="p-4">
          <h3 className="text-white text-lg font-bold mb-1">{post.title}</h3>
          {post.excerpt && <p className="text-gray-400 text-sm line-clamp-2">{post.excerpt}</p>}
        </div>
      </article>
    </Link>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/enhancers/PostFeatured.tsx src/components/enhancers/PostCard.tsx
git commit -m "feat: post components for the Enhancers grid"
```

---

## Task 18: Gated /enhancers landing page

**Files:**
- Create: `src/app/enhancers/page.tsx`

- [ ] **Step 1: Build the page (server component)**

Create `src/app/enhancers/page.tsx`:

```tsx
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import PostFeatured from "@/components/enhancers/PostFeatured";
import PostCard from "@/components/enhancers/PostCard";

export const metadata = {
  title: "Enhancers · Live Music Enhancers",
};

export default async function EnhancersPage() {
  const posts = await fetchQuery(api.posts.getPublishedPosts, { limit: 7 });
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p._id !== featured?._id);

  return (
    <main className="min-h-screen bg-black px-6 md:px-12 lg:px-24 py-12">
      <header className="max-w-6xl mx-auto mb-8">
        <p className="text-teal-400 uppercase tracking-widest text-sm">LME · Enhancers</p>
        <h1 className="text-white text-4xl md:text-5xl font-bold mt-2">For our inner circle.</h1>
      </header>

      <div className="max-w-6xl mx-auto space-y-12">
        {featured ? (
          <PostFeatured post={featured} />
        ) : (
          <p className="text-gray-400">No content yet — check back soon.</p>
        )}

        {rest.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((p) => (
              <PostCard key={p._id} post={p} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/enhancers/page.tsx
git commit -m "feat: /enhancers landing page (featured + grid)"
```

---

## Task 19: Post detail page

**Files:**
- Create: `src/app/enhancers/posts/[slug]/page.tsx`

- [ ] **Step 1: Build the page**

Create `src/app/enhancers/posts/[slug]/page.tsx`:

```tsx
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchQuery(api.posts.getPostBySlug, { slug });
  if (!post || post.status !== "published") notFound();

  return (
    <main className="min-h-screen bg-black px-6 md:px-12 lg:px-24 py-12">
      <article className="max-w-3xl mx-auto">
        <p className="text-teal-400 uppercase tracking-widest text-sm">Enhancers</p>
        <h1 className="text-white text-4xl md:text-5xl font-bold mt-2 mb-4">{post.title}</h1>
        {post.publishedDate && (
          <time className="text-gray-500 text-sm">
            {new Date(post.publishedDate).toLocaleDateString()}
          </time>
        )}
        {post.heroImageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={post.heroImageUrl} alt="" className="rounded-lg my-8 w-full" />
        )}
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      </article>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/enhancers/posts/[slug]/page.tsx
git commit -m "feat: /enhancers/posts/[slug] post detail page"
```

---

## Task 20: proxy.ts auth gate (both surfaces)

**Files:**
- Create: `proxy.ts` (project root)

- [ ] **Step 1: Build the unified proxy**

Create `proxy.ts` at the project root:

```ts
import { NextRequest, NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/enhancers/session";

const isEnhancersGate = createRouteMatcher([
  "/enhancers",
  "/enhancers/posts/(.*)",
]);

const isAdminGate = createRouteMatcher(["/admin", "/admin/(.*)"]);
const isAdminPublic = createRouteMatcher(["/admin/sign-in(.*)"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Enhancers gate
  if (isEnhancersGate(req)) {
    const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) {
      return NextResponse.redirect(new URL("/enhancers/login", req.url));
    }
    try {
      await verifySession(cookie);
    } catch {
      const res = NextResponse.redirect(new URL("/enhancers/login", req.url));
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }
  }

  // Admin gate
  if (isAdminGate(req) && !isAdminPublic(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/admin/sign-in", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on everything except static assets and API
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
```

- [ ] **Step 2: Manual test — unauthenticated /enhancers**

Open an incognito window. Visit `http://localhost:3000/enhancers`. Expected: redirect to `/enhancers/login`.

- [ ] **Step 3: Manual test — unauthenticated /admin**

Visit `http://localhost:3000/admin`. Expected: redirect to `/admin/sign-in`.

- [ ] **Step 4: Manual test — authenticated /enhancers**

Sign in via the magic-link flow. Expected: `/enhancers` renders.

- [ ] **Step 5: Commit**

```bash
git add proxy.ts
git commit -m "feat: proxy.ts gates /enhancers/* and /admin/*"
```

---

## Task 21: Admin layout

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/admin/AdminShell.tsx`

- [ ] **Step 1: Build the shell component**

Create `src/components/admin/AdminShell.tsx`:

```tsx
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white grid grid-cols-[260px_1fr]">
      <aside className="border-r border-gray-900 p-6">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-teal-400">LME</p>
          <p className="font-bold">Admin</p>
        </div>
        <nav className="space-y-1 text-sm">
          <Link href="/admin" className="block px-3 py-2 rounded hover:bg-gray-900">Dashboard</Link>
          <span className="block px-3 py-2 text-gray-600 cursor-not-allowed" title="Coming in #2">Bookings</span>
          <span className="block px-3 py-2 text-gray-600 cursor-not-allowed" title="Coming in #1b">Compose</span>
          <span className="block px-3 py-2 text-gray-600 cursor-not-allowed" title="Coming in #1b">Library</span>
          <span className="block px-3 py-2 text-gray-600 cursor-not-allowed" title="Coming in #3">Tasks</span>
        </nav>
        <div className="mt-12 pt-8 border-t border-gray-900">
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>
      <main className="p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Build the layout**

Create `src/app/admin/layout.tsx`:

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/admin/sign-in");
  return <AdminShell>{children}</AdminShell>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx src/components/admin/AdminShell.tsx
git commit -m "feat: /admin layout with sidebar shell"
```

---

## Task 22: Admin dashboard

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/AdminDashboard.tsx`

- [ ] **Step 1: Build the dashboard component**

Create `src/components/admin/AdminDashboard.tsx`:

```tsx
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-900 p-6">
      <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  const stats = await fetchQuery(api.contacts.getEnhancersDashboardStats, {});
  const recent = await fetchQuery(api.contacts.getRecentSignups, { limit: 10 });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-teal-400">Overview</p>
        <h1 className="text-3xl font-bold mt-1">Dashboard</h1>
      </header>

      <div className="grid grid-cols-3 gap-6">
        <StatCard label="Total Enhancers" value={stats.total} />
        <StatCard label="Last 7 days" value={stats.last7} />
        <StatCard label="Last 30 days" value={stats.last30} />
      </div>

      <section>
        <h2 className="text-lg font-bold mb-3">Recent signups</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b border-gray-900">
            <tr>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Joined</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((c) => (
              <tr key={c._id} className="border-b border-gray-900/50">
                <td className="py-2 pr-4">{c.email}</td>
                <td className="py-2 pr-4 text-gray-400">{c.status}</td>
                <td className="py-2 pr-4 text-gray-400">
                  {new Date(c.signupDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td className="py-4 text-gray-500" colSpan={3}>No signups yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Build the page**

Create `src/app/admin/page.tsx`:

```tsx
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata = { title: "LME Admin · Dashboard" };

export default function AdminHomePage() {
  return <AdminDashboard />;
}
```

- [ ] **Step 3: Manual test**

Sign in via Clerk at `/admin/sign-in`. Confirm the dashboard renders with the live counts.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/AdminDashboard.tsx
git commit -m "feat: /admin dashboard with Enhancers stats and recent signups"
```

---

## Task 23: Seed three real Enhancer posts

**Files:**
- Create: `scripts/seed-enhancer-posts.ts`

- [ ] **Step 1: Write the seed script**

Create `scripts/seed-enhancer-posts.ts`:

```ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Run with: npx tsx scripts/seed-enhancer-posts.ts

async function main() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL not set");
  const convex = new ConvexHttpClient(url);

  const posts = [
    {
      title: "Welcome to the Enhancers",
      slug: "welcome-to-the-enhancers",
      excerpt: "You're inside. Here's what to expect.",
      bodyHtml: "<p>You just joined LME's inner circle. From here on you'll get exclusive content, mixes, and behind-the-scenes — straight to your inbox and visible here.</p><p>We'll start drops in the coming weeks. Check back, or wait for the email.</p>",
      heroImageUrl: "https://lmeband.com/Pictures/hero-placeholder.jpg",
      featured: true,
    },
    {
      title: "Recap: Flashback Fete at Mama Roux's",
      slug: "flashback-fete-recap",
      excerpt: "Photos and a few words from the night.",
      bodyHtml: "<p>The room was packed. The set ran till curfew. Here's the recap.</p>",
      heroImageUrl: "https://lmeband.com/Pictures/flashback-fete.jpg",
      featured: false,
    },
    {
      title: "Listen: latest mix on SoundCloud",
      slug: "latest-mix-soundcloud",
      excerpt: "Fresh from the studio, exclusively for Enhancers first.",
      bodyHtml: '<p>Drop the volume. <a href="https://soundcloud.com/lmeband">Listen on SoundCloud →</a></p>',
      heroImageUrl: "https://lmeband.com/Pictures/mix-cover.jpg",
      featured: false,
    },
  ];

  // Create a one-off Convex internalMutation in convex/posts.ts called seedPost(...)
  // (Add this to convex/posts.ts before running the script.)
  for (const p of posts) {
    await (convex.mutation as any)("posts:seedPost", {
      ...p,
      type: "post",
      status: "published",
      publishedDate: Date.now(),
      embedUrls: [],
    });
    console.log(`Seeded: ${p.slug}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Add the seed mutation to convex/posts.ts**

Append to `convex/posts.ts`:

```ts
import { mutation } from "./_generated/server";

export const seedPost = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    bodyHtml: v.string(),
    heroImageUrl: v.optional(v.string()),
    featured: v.boolean(),
    type: v.union(v.literal("post"), v.literal("mix"), v.literal("listen-link"), v.literal("feedback-request")),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    publishedDate: v.optional(v.number()),
    embedUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("posts", args);
  },
});
```

- [ ] **Step 3: Push to Convex and run the seed**

```bash
pnpm dlx convex dev --once
pnpm dlx tsx scripts/seed-enhancer-posts.ts
```

Expected: three lines like `Seeded: welcome-to-the-enhancers`.

- [ ] **Step 4: Visual verification**

Sign in as an Enhancer (use the magic-link flow with your email). Visit `/enhancers`. Expected: featured "Welcome to the Enhancers" hero + 2 cards in the grid.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-enhancer-posts.ts convex/posts.ts
git commit -m "chore: seed three starter posts for /enhancers"
```

---

## Task 24: Verify acceptance criteria

**Files:** none (verification pass)

- [ ] **Step 1: Acceptance #1 — signup → email within 30s**

In incognito, visit `http://localhost:3000`. Submit a real test email. Confirm the welcome email arrives within 30 seconds. Confirm the link looks correct.

- [ ] **Step 2: Acceptance #2 — magic-link redeems and renders /enhancers**

Click the link. Confirm redirect to `/enhancers`. Confirm featured post + grid render.

- [ ] **Step 3: Acceptance #3 — returning visit (cookie present)**

Close the tab. Reopen `http://localhost:3000/enhancers` directly. Confirm immediate access (no login prompt).

- [ ] **Step 4: Acceptance #4 — Convex publish reactivity**

In the Convex dashboard, change one post's `status` from `published` to `draft`. Confirm the `/enhancers` page no longer renders it on next request.

- [ ] **Step 5: Acceptance #5 — gate enforces unauthenticated**

Open another incognito window. Visit `/enhancers`. Confirm redirect to `/enhancers/login`.

- [ ] **Step 6: Acceptance #6 — Clerk admin sign-in works**

Sign in to `/admin/sign-in`. Confirm landing on the dashboard with live counts.

- [ ] **Step 7: Acceptance #7 — /admin gate**

In another incognito window, visit `/admin`. Confirm redirect to `/admin/sign-in`.

- [ ] **Step 8: Acceptance #8 — schemas reserved**

```bash
grep -E '^\s+(campaigns|assets|bookings|tasks|projects|events|discussions|messages):' convex/schema.ts
```

Expected: 8 lines, one per reserved table.

- [ ] **Step 9: Acceptance #9 — booking flow not regressed**

Submit a real booking via `/bookingform`. Confirm the booking still appears in the existing Notion DB. Confirm the confirmation email still arrives.

- [ ] **Step 10: Acceptance #10 — three real posts exist**

```bash
# In Convex dashboard or via:
pnpm dlx convex run posts:getPublishedPosts '{}'
```

Expected: 3 posts returned.

- [ ] **Step 11: Push to Vercel preview**

```bash
git push origin main
```

Wait for Vercel preview deploy. Run acceptance steps 1-7 against the preview URL to catch any prod-mode bugs (cookie `Secure` flag, Clerk production-key swap, etc.).

- [ ] **Step 12: Final commit (if any cleanup)**

```bash
git status
# If clean, no commit needed. Otherwise:
git add .
git commit -m "chore: final touches for #1a Enhancers Foundation"
```

---

## Self-Review Notes

**Spec coverage:** All 10 acceptance criteria from the spec map directly to tasks 24.1–24.10. The 12 reserved schemas in `convex/schema.ts` (Task 4) match the spec's data model section. Magic-link flow (signup → email → redeem → cookie → `/enhancers`) covered by Tasks 7, 9, 10, 12, 13, 14. `/admin` shell + dashboard (Tasks 21–22) ships with the dashboard counts the spec requires.

**Type consistency:** `signupOrLogin`, `redeemMagicLink`, `getPublishedPosts`, `getPostBySlug`, `getEnhancersDashboardStats`, `getRecentSignups` are referenced consistently throughout. `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE_SECONDS`, `MAGIC_LINK_TTL_MS` defined once and imported.

**Placeholder scan:** No "TBD", "TODO", or vague-error-handling steps remain. Each step has a concrete command, code block, or verification.

**Known gaps deliberately deferred:**
- Branded site form for profile completion (deferred to #1b per spec)
- React Email *campaign* template (separate from welcome template — built in #1c)
- Per-user Anthropic API key UI in `/admin/settings` (deferred to #1b — only the `privateMetadata` shape is reserved here)
- Full booking schema details (`detailsBlob` is `v.any()` placeholder — finalized in #2)
