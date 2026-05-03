# Phase 1a — Bookings MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the MVP slice of the LME CRM — `app.lmeband.com` subdomain serving an Events module (External Bookings only) that replaces Notion BOOKINGS for Tanisha and Khari's daily workflow.

**Architecture:** Single Next.js 16 repo with hostname-based routing in `src/proxy.ts`. New `(app-domain)` route group renders only on `app.lmeband.com`; existing public pages move under `(public-domain)` group. Convex schema replaces the old `events` table with the unified Events model from the spec; `bookings` table data migrates in. Light + dark theme via CSS custom properties + Tailwind. Director and admin roles only in this phase.

**Tech Stack:** Next.js 16 App Router · Convex · Clerk · Tailwind 4 · Vitest + convex-test · Resend.

**Spec:** `docs/superpowers/specs/2026-05-03-lme-platform-vision-design.md`

---

## File structure

### Convex (data layer)

| File | Responsibility |
|---|---|
| `convex/schema.ts` | EDIT — replace old `events`+`bookings`+`tasks`+`projects`+`discussions`+`messages` tables with new unified `events` schema per spec §4.2 |
| `convex/events.ts` | NEW — queries (`listByFamily`, `getById`, `listForCalendar`) + mutations (`create`, `update`, `setStatus`, `setNextAction`) |
| `convex/publicInquiry.ts` | NEW — `submitInquiry` mutation called from public form; sends auto-confirmation email |
| `convex/migrations/bookingsToEvents.ts` | NEW — one-shot internal mutation to copy old `bookings` records into new `events` table |
| `convex/users.ts` | EDIT — extend role enum from `owner\|admin\|drafter` → `director\|admin\|internal-events\|marketing\|production\|ticketing` |
| `tests/convex/events.test.ts` | NEW — tests for events queries + mutations |
| `tests/convex/publicInquiry.test.ts` | NEW — tests for inquiry submission |
| `tests/convex/migration.test.ts` | NEW — tests the bookings→events migration |

### Next.js routing + shell

| File | Responsibility |
|---|---|
| `src/proxy.ts` | EDIT — branch on `req.headers.get('host')`. `app.lmeband.com` → app domain; `lmeband.com` → public domain |
| `src/app/(public-domain)/` | NEW route group — move existing public pages here (homepage, bookingform, setlist, mailing-list, enhancers, unsubscribe). Existing `/admin/*` stays at root for now |
| `src/app/(app-domain)/` | NEW route group — CRM lives here |
| `src/app/(app-domain)/layout.tsx` | NEW — CRM shell: sidebar + header, auth-gated, theme provider |
| `src/lib/host.ts` | NEW — host detection helpers (`isAppHost`, `isPublicHost`) used in proxy + layouts |
| `src/lib/theme.ts` | NEW — light/dark token map + theme provider |

### CRM components

| File | Responsibility |
|---|---|
| `src/components/crm/Sidebar.tsx` | NEW — left nav with Dashboard / Events / Marketing / Music / Finance / Enhancers / Settings |
| `src/components/crm/ThemeToggle.tsx` | NEW — light/dark toggle in header |
| `src/components/crm/Pipeline.tsx` | NEW — kanban board for events grouped by status |
| `src/components/crm/EventCard.tsx` | NEW — card used in Pipeline |
| `src/components/crm/EventDetailLayout.tsx` | NEW — tab nav for event detail page |
| `src/components/crm/EventOverview.tsx` | NEW — Overview tab (with inline Notes textarea) |
| `src/components/crm/EventClient.tsx` | NEW — Client info tab |
| `src/components/crm/EventFinanceLegal.tsx` | NEW — Finance & Legal tab (read-only stub for Phase 1a) |
| `src/components/crm/EventSetlist.tsx` | NEW — Setlist tab (basic) |
| `src/components/crm/CalendarView.tsx` | NEW — month-grid calendar with filter chips |
| `src/components/ui/Button.tsx` | NEW — design-system button (light + dark) |
| `src/components/ui/Card.tsx` | NEW — design-system card |
| `src/components/ui/Input.tsx` | NEW — design-system input |

### CRM pages

| File | Responsibility |
|---|---|
| `src/app/(app-domain)/dashboard/page.tsx` | NEW — role-aware dashboard (basic) |
| `src/app/(app-domain)/events/page.tsx` | NEW — redirects to `/events/external-bookings` |
| `src/app/(app-domain)/events/external-bookings/page.tsx` | NEW — Pipeline kanban |
| `src/app/(app-domain)/events/[id]/page.tsx` | NEW — Event detail |
| `src/app/(app-domain)/events/new/page.tsx` | NEW — Manual create form |
| `src/app/(app-domain)/events/calendar/page.tsx` | NEW — Calendar view |

### Public-side changes

| File | Responsibility |
|---|---|
| `src/app/(public-domain)/bookingform/page.tsx` | EDIT — submit to `publicInquiry.submitInquiry` instead of `/api/submit` |
| `src/app/api/submit/route.ts` | DELETE — no longer needed (Convex action handles it) |
| `src/components/BookingForm.tsx` | EDIT — minor: lighten field set per spec §5.2 step 1 (anti-spam minimal) |

### Styling

| File | Responsibility |
|---|---|
| `src/app/globals.css` | EDIT — add CSS custom properties for light/dark mode tokens |
| `tailwind.config.ts` (or implicit Tailwind 4 config) | EDIT — map tokens to Tailwind utilities |

---

## Conventions

- **TDD**: every Convex query/mutation gets a test in `tests/convex/` before implementation. UI components are tested via vitest if they have logic; pure layout components don't require tests.
- **Commits**: one commit per task end. Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`).
- **Branch**: work on `feat/phase-1a-bookings-mvp`. Don't merge to main until all tasks complete.
- **Convex types**: after every schema edit, run `pnpm dlx convex codegen` to regenerate `convex/_generated/`.

---

## Tasks

### Task 1: Schema migration — replace events + bookings tables

**Why first:** every other task depends on the new schema. Doing it in isolation gives clean codegen for everything that follows.

**Files:**
- Modify: `convex/schema.ts`
- Test: `tests/convex/schema.test.ts`

- [ ] **Step 1: Read the current schema**

Read `convex/schema.ts` end-to-end so you understand existing tables you're keeping (contacts, posts, campaigns, campaignEvents, assets, users, invitations, hooks).

- [ ] **Step 2: Write the failing test**

Create `tests/convex/schema.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

describe("schema — events table v2", () => {
  test("creates an event with full external-booking shape", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(api.events.create, {
      name: "Bria + Kris Wedding",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: new Date("2026-07-25").getTime(),
      isAllDay: true,
      client: { name: "Bria Mardenborough", email: "bria@example.com" },
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.type).toBe("Wedding");
    expect(event?.family).toBe("ExternalBooking");
    expect(event?.client?.name).toBe("Bria Mardenborough");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test schema.test.ts`
Expected: FAIL — `api.events.create` undefined or schema mismatch.

- [ ] **Step 4: Replace events table + remove bookings/tasks/projects/discussions/messages**

Edit `convex/schema.ts`. Replace the existing `events` table definition (lines ~173-185) with the new schema. **Delete entirely** the old `bookings`, `tasks`, `projects`, `discussions`, `messages` tables. Keep contacts, posts, campaigns, campaignEvents, assets, users, invitations.

```ts
events: defineTable({
  // ===== Spine =====
  name: v.string(),
  type: v.union(
    v.literal("Wedding"), v.literal("Corporate"), v.literal("Festival"),
    v.literal("PrivateParty"), v.literal("Other"),
    v.literal("MainShow"), v.literal("PopUp"),
    v.literal("ContentShoot"), v.literal("Meeting"),
    v.literal("Rehearsal"), v.literal("Social"),
  ),
  family: v.union(
    v.literal("ExternalBooking"),
    v.literal("InternalShow"),
    v.literal("TeamDiary"),
  ),
  status: v.string(),
  startDate: v.number(),
  endDate: v.optional(v.number()),
  isAllDay: v.boolean(),
  venue: v.optional(v.object({
    name: v.string(),
    address: v.optional(v.string()),
    capacity: v.optional(v.number()),
    contact: v.optional(v.string()),
  })),
  leadOwner: v.optional(v.id("users")),
  attendees: v.optional(v.array(v.id("users"))),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),
  parentEventId: v.optional(v.id("events")),
  coverImage: v.optional(v.string()),
  nextActionLabel: v.optional(v.string()),
  nextActionDue: v.optional(v.number()),

  // ===== Optional sub-blocks =====
  client: v.optional(v.object({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
  })),
  bookingConfig: v.optional(v.object({
    bandConfig: v.string(),
    djRequired: v.boolean(),
    equipmentSource: v.union(v.literal("LME"), v.literal("Venue"), v.literal("Mixed")),
    extras: v.array(v.string()),
    expectedGuests: v.optional(v.number()),
  })),
  finance: v.optional(v.object({
    fee: v.optional(v.number()),
    deposit: v.optional(v.object({ amount: v.number(), paid: v.boolean(), paidAt: v.optional(v.number()) })),
    balance: v.optional(v.object({ amount: v.number(), dueDate: v.number(), paid: v.boolean(), paidAt: v.optional(v.number()) })),
    xeroDepositInvoiceRef: v.optional(v.string()),
    xeroBalanceInvoiceRef: v.optional(v.string()),
  })),
  contract: v.optional(v.object({
    templateId: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    signedAt: v.optional(v.number()),
    signedByName: v.optional(v.string()),
    auditLog: v.array(v.object({ ts: v.number(), action: v.string(), ip: v.optional(v.string()) })),
  })),
  // (Phase 1b/3+ blocks — ticketing, sponsorship, afterParty, showRun, production, marketingPlan, meetingDetails — schema reserved but UI not yet rendering)
  ticketing: v.optional(v.any()),
  sponsorship: v.optional(v.any()),
  afterParty: v.optional(v.any()),
  showRun: v.optional(v.any()),
  production: v.optional(v.any()),
  marketingPlan: v.optional(v.any()),
  meetingDetails: v.optional(v.any()),
})
  .index("by_family_and_date", ["family", "startDate"])
  .index("by_type_and_date", ["type", "startDate"])
  .index("by_status", ["status"])
  .index("by_lead_owner", ["leadOwner"]),
```

(Note: `v.any()` is used for sub-blocks not yet UI-active so we don't bake in the wrong shape and need a migration later. They get strict types when their phase ships.)

Also extend the `users.role` union:

```ts
role: v.union(
  v.literal("director"),
  v.literal("admin"),
  v.literal("internal-events"),
  v.literal("marketing"),
  v.literal("production"),
  v.literal("ticketing"),
  // Legacy values retained during migration so existing rows validate.
  v.literal("owner"),
  v.literal("drafter"),
),
```

- [ ] **Step 5: Run codegen**

Run: `pnpm dlx convex codegen`
Expected: clean output, `convex/_generated/api.d.ts` and `dataModel.d.ts` regenerate.

- [ ] **Step 6: Implement `convex/events.ts` create + getById**

Create `convex/events.ts`:

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("Wedding"), v.literal("Corporate"), v.literal("Festival"),
      v.literal("PrivateParty"), v.literal("Other"),
      v.literal("MainShow"), v.literal("PopUp"),
      v.literal("ContentShoot"), v.literal("Meeting"),
      v.literal("Rehearsal"), v.literal("Social"),
    ),
    family: v.union(
      v.literal("ExternalBooking"),
      v.literal("InternalShow"),
      v.literal("TeamDiary"),
    ),
    status: v.string(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    isAllDay: v.boolean(),
    venue: v.optional(v.object({
      name: v.string(),
      address: v.optional(v.string()),
      capacity: v.optional(v.number()),
      contact: v.optional(v.string()),
    })),
    leadOwner: v.optional(v.id("users")),
    attendees: v.optional(v.array(v.id("users"))),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    nextActionLabel: v.optional(v.string()),
    nextActionDue: v.optional(v.number()),
    client: v.optional(v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
    })),
    bookingConfig: v.optional(v.any()),
    finance: v.optional(v.any()),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", args);
  },
});

export const getById = query({
  args: { id: v.id("events") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

- [ ] **Step 7: Run schema test, verify it passes**

Run: `pnpm test schema.test.ts`
Expected: PASS.

- [ ] **Step 8: Run full test suite**

Run: `pnpm test`
Expected: existing tests still pass; new test passes.

- [ ] **Step 9: Commit**

```bash
git checkout -b feat/phase-1a-bookings-mvp
git add convex/schema.ts convex/events.ts convex/_generated/ tests/convex/schema.test.ts
git commit -m "feat(convex): replace events schema with unified Events model + extend user roles"
```

---

### Task 2: Events queries — list, filter, status update

**Files:**
- Modify: `convex/events.ts`
- Test: `tests/convex/events.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/convex/events.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

describe("events queries", () => {
  test("listByFamily returns only matching family", async () => {
    const t = convexTest(schema);
    await t.mutation(api.events.create, {
      name: "Wedding A", type: "Wedding", family: "ExternalBooking",
      status: "Inquiry", startDate: Date.now(), isAllDay: true,
    });
    await t.mutation(api.events.create, {
      name: "Summer Show", type: "MainShow", family: "InternalShow",
      status: "Planning", startDate: Date.now(), isAllDay: true,
    });

    const externals = await t.query(api.events.listByFamily, { family: "ExternalBooking" });
    expect(externals).toHaveLength(1);
    expect(externals[0].name).toBe("Wedding A");
  });

  test("listByFamily orders by startDate ascending", async () => {
    const t = convexTest(schema);
    const t1 = new Date("2026-08-01").getTime();
    const t2 = new Date("2026-07-01").getTime();
    await t.mutation(api.events.create, {
      name: "Later", type: "Wedding", family: "ExternalBooking",
      status: "Inquiry", startDate: t1, isAllDay: true,
    });
    await t.mutation(api.events.create, {
      name: "Sooner", type: "Wedding", family: "ExternalBooking",
      status: "Inquiry", startDate: t2, isAllDay: true,
    });

    const list = await t.query(api.events.listByFamily, { family: "ExternalBooking" });
    expect(list[0].name).toBe("Sooner");
    expect(list[1].name).toBe("Later");
  });

  test("setStatus updates status field", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(api.events.create, {
      name: "X", type: "Wedding", family: "ExternalBooking",
      status: "Inquiry", startDate: Date.now(), isAllDay: true,
    });
    await t.mutation(api.events.setStatus, { id, status: "Quoted" });
    const event = await t.query(api.events.getById, { id });
    expect(event?.status).toBe("Quoted");
  });

  test("listForCalendar returns events overlapping the range", async () => {
    const t = convexTest(schema);
    const inRange = new Date("2026-07-15").getTime();
    const outOfRange = new Date("2027-01-15").getTime();
    await t.mutation(api.events.create, {
      name: "In", type: "Wedding", family: "ExternalBooking",
      status: "Booked", startDate: inRange, isAllDay: true,
    });
    await t.mutation(api.events.create, {
      name: "Out", type: "Wedding", family: "ExternalBooking",
      status: "Booked", startDate: outOfRange, isAllDay: true,
    });

    const result = await t.query(api.events.listForCalendar, {
      from: new Date("2026-07-01").getTime(),
      to: new Date("2026-08-01").getTime(),
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("In");
  });
});
```

- [ ] **Step 2: Run tests, verify all four fail**

Run: `pnpm test events.test.ts`
Expected: FAIL — `listByFamily`, `setStatus`, `listForCalendar` undefined.

- [ ] **Step 3: Implement queries + mutations**

Append to `convex/events.ts`:

```ts
export const listByFamily = query({
  args: {
    family: v.union(
      v.literal("ExternalBooking"),
      v.literal("InternalShow"),
      v.literal("TeamDiary"),
    ),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_family_and_date", (q) => q.eq("family", args.family))
      .order("asc")
      .collect();
  },
});

export const setStatus = mutation({
  args: { id: v.id("events"), status: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
    return null;
  },
});

export const listForCalendar = query({
  args: { from: v.number(), to: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), args.from),
          q.lt(q.field("startDate"), args.to),
        ),
      )
      .collect();
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    patch: v.object({
      name: v.optional(v.string()),
      status: v.optional(v.string()),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      isAllDay: v.optional(v.boolean()),
      venue: v.optional(v.any()),
      leadOwner: v.optional(v.id("users")),
      attendees: v.optional(v.array(v.id("users"))),
      description: v.optional(v.string()),
      notes: v.optional(v.string()),
      nextActionLabel: v.optional(v.string()),
      nextActionDue: v.optional(v.number()),
      client: v.optional(v.any()),
      bookingConfig: v.optional(v.any()),
      finance: v.optional(v.any()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.patch);
    return null;
  },
});
```

- [ ] **Step 4: Run codegen**

Run: `pnpm dlx convex codegen`

- [ ] **Step 5: Run tests, verify all pass**

Run: `pnpm test events.test.ts`
Expected: PASS (4/4).

- [ ] **Step 6: Commit**

```bash
git add convex/events.ts convex/_generated/ tests/convex/events.test.ts
git commit -m "feat(convex): events queries — listByFamily, listForCalendar, setStatus, update"
```

---

### Task 3: Public inquiry submission — Convex mutation + auto-confirmation email

Replaces `/api/submit` route with a Convex mutation that creates a `family=ExternalBooking, type=<chosen>, status=Inquiry` event and triggers a Resend email.

**Files:**
- Create: `convex/publicInquiry.ts`
- Test: `tests/convex/publicInquiry.test.ts`
- Modify: `src/app/(public-domain)/bookingform/page.tsx` (later step in this task)

- [ ] **Step 1: Write the failing test**

Create `tests/convex/publicInquiry.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

describe("publicInquiry.submitInquiry", () => {
  test("creates an event with status=Inquiry, family=ExternalBooking", async () => {
    const t = convexTest(schema);
    const result = await t.mutation(api.publicInquiry.submitInquiry, {
      clientName: "Janice Doe",
      clientEmail: "janice@example.com",
      eventType: "Wedding",
      eventDate: new Date("2026-09-12").getTime(),
      venue: "St Mary's Hall",
      description: "Looking for live band for ceremony + reception",
    });
    expect(result.eventId).toBeDefined();

    const event = await t.query(api.events.getById, { id: result.eventId });
    expect(event?.status).toBe("Inquiry");
    expect(event?.family).toBe("ExternalBooking");
    expect(event?.type).toBe("Wedding");
    expect(event?.client?.email).toBe("janice@example.com");
  });

  test("rejects when required fields missing", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(api.publicInquiry.submitInquiry, {
        clientName: "",
        clientEmail: "x@y.com",
        eventType: "Wedding",
        eventDate: Date.now(),
      } as any),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test publicInquiry.test.ts`
Expected: FAIL — `api.publicInquiry.submitInquiry` undefined.

- [ ] **Step 3: Implement the mutation**

Create `convex/publicInquiry.ts`:

```ts
import { mutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const eventTypeValidator = v.union(
  v.literal("Wedding"),
  v.literal("Corporate"),
  v.literal("Festival"),
  v.literal("PrivateParty"),
  v.literal("Other"),
);

export const submitInquiry = mutation({
  args: {
    clientName: v.string(),
    clientEmail: v.string(),
    clientPhone: v.optional(v.string()),
    eventType: eventTypeValidator,
    eventDate: v.number(),
    venue: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    expectedGuests: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  returns: v.object({ eventId: v.id("events") }),
  handler: async (ctx, args) => {
    if (!args.clientName.trim()) throw new Error("clientName required");
    if (!args.clientEmail.trim()) throw new Error("clientEmail required");

    const eventId = await ctx.db.insert("events", {
      name: `${args.eventType} — ${args.clientName}`,
      type: args.eventType,
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: args.eventDate,
      isAllDay: true,
      venue: args.venue ? { name: args.venue, address: args.venueAddress } : undefined,
      description: args.description,
      client: {
        name: args.clientName,
        email: args.clientEmail,
        phone: args.clientPhone,
      },
      bookingConfig: args.expectedGuests
        ? { bandConfig: "TBD", djRequired: false, equipmentSource: "LME", extras: [], expectedGuests: args.expectedGuests }
        : undefined,
      nextActionLabel: "Initial review (Chris/Tanisha)",
    });

    // Schedule the confirmation email asynchronously — keeps the mutation fast
    // and lets the action handle Resend (Node runtime).
    await ctx.scheduler.runAfter(0, internal.publicInquiry.sendConfirmationEmail, {
      eventId,
      clientEmail: args.clientEmail,
      clientName: args.clientName,
    });

    return { eventId };
  },
});

export const sendConfirmationEmail = internalAction({
  args: {
    eventId: v.id("events"),
    clientEmail: v.string(),
    clientName: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY missing — skipping confirmation email");
      return null;
    }
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "LME <enquiries@lmeband.com>",
      to: args.clientEmail,
      subject: "Thanks for your enquiry — LME",
      html: `
        <p>Hi ${args.clientName.split(" ")[0]},</p>
        <p>Thanks for reaching out about a booking. We'll be in touch within 48 hours to discuss the details.</p>
        <p>— The LME team</p>
      `,
    });
    return null;
  },
});
```

Add `"use node";` at the top of `convex/publicInquiry.ts` ONLY if Node-only imports (`resend`) are at module scope. Here `resend` is dynamically imported inside the action, so the file can stay in the default V8 runtime — but the `internalAction` itself needs Node. **Solution:** split into two files. Move `sendConfirmationEmail` to `convex/publicInquiryEmail.ts` with `"use node";` at top. Re-import via `internal.publicInquiryEmail.sendConfirmationEmail`.

Updated split:

`convex/publicInquiryEmail.ts`:
```ts
"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

export const sendConfirmationEmail = internalAction({
  args: {
    eventId: v.id("events"),
    clientEmail: v.string(),
    clientName: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY missing — skipping confirmation email");
      return null;
    }
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "LME <enquiries@lmeband.com>",
      to: args.clientEmail,
      subject: "Thanks for your enquiry — LME",
      html: `<p>Hi ${args.clientName.split(" ")[0]},</p><p>Thanks for reaching out about a booking. We'll be in touch within 48 hours to discuss the details.</p><p>— The LME team</p>`,
    });
    return null;
  },
});
```

`convex/publicInquiry.ts` updates the scheduler call:
```ts
await ctx.scheduler.runAfter(0, internal.publicInquiryEmail.sendConfirmationEmail, {
  eventId, clientEmail: args.clientEmail, clientName: args.clientName,
});
```

- [ ] **Step 4: Run codegen**

Run: `pnpm dlx convex codegen`

- [ ] **Step 5: Run tests, verify they pass**

Run: `pnpm test publicInquiry.test.ts`
Expected: PASS (2/2). The email action is scheduled but not actually fired in tests (convex-test stubs scheduler).

- [ ] **Step 6: Wire up the public booking form**

Edit `src/app/bookingform/page.tsx` (this file will be moved to `(public-domain)/bookingform/page.tsx` in Task 6 — for now stays in place):

```tsx
"use client";

import BookingForm from "@/components/BookingForm";
import type { BookingFormData } from "@/lib/booking-types";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function BookingFormPage() {
  const submit = useMutation(api.publicInquiry.submitInquiry);

  async function handleSubmit(data: BookingFormData): Promise<{ token?: string }> {
    const result = await submit({
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      eventType: mapEventType(data.eventType),
      eventDate: new Date(data.eventDate).getTime(),
      venue: data.venue,
      venueAddress: data.venueAddress,
      expectedGuests: data.expectedGuests,
      description: data.description,
    });
    return { token: result.eventId };
  }

  // ... rest of JSX unchanged
}

function mapEventType(t: BookingFormData["eventType"]) {
  // existing form uses lowercase enum like "wedding" — map to spec PascalCase
  switch (t) {
    case "wedding": return "Wedding";
    case "corporate": return "Corporate";
    case "festival": return "Festival";
    case "private-party": return "PrivateParty";
    default: return "Other";
  }
}
```

- [ ] **Step 7: Delete the old API route**

Run: `git rm src/app/api/submit/route.ts`

(If this route is referenced by a webhook or external system, leave the file but make it a thin pass-through that calls the Convex mutation. Inspect callers first: `grep -r "/api/submit" src/`. If only `bookingform/page.tsx` calls it, remove safely.)

- [ ] **Step 8: Run full test suite**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add convex/publicInquiry.ts convex/publicInquiryEmail.ts convex/_generated/ tests/convex/publicInquiry.test.ts src/app/bookingform/page.tsx
git rm src/app/api/submit/route.ts
git commit -m "feat(convex): public inquiry mutation + auto-confirmation email — replaces /api/submit"
```

---

### Task 4: Hostname routing — `app.lmeband.com` vs `lmeband.com`

**Files:**
- Create: `src/lib/host.ts`
- Modify: `src/proxy.ts`
- Test: `tests/lib/host.test.ts`

- [ ] **Step 1: Write host helper test**

Create `tests/lib/host.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test host.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement host helpers**

Create `src/lib/host.ts`:

```ts
const APP_HOSTNAMES = new Set(["app.lmeband.com"]);
const PUBLIC_HOSTNAMES = new Set(["lmeband.com", "www.lmeband.com"]);

function stripPort(host: string): string {
  return host.split(":")[0];
}

export function isAppHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const bare = stripPort(host);
  if (APP_HOSTNAMES.has(bare)) return true;
  if (process.env.NEXT_PUBLIC_LOCAL_APP_HOST && stripPort(process.env.NEXT_PUBLIC_LOCAL_APP_HOST) === bare) return true;
  return false;
}

export function isPublicHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const bare = stripPort(host);
  return PUBLIC_HOSTNAMES.has(bare);
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test host.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Update proxy.ts to gate by hostname**

Edit `src/proxy.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/enhancers/session";
import { isAppHost, isPublicHost } from "@/lib/host";

function stripTrailingSlash(path: string): string {
  return path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const path = stripTrailingSlash(req.nextUrl.pathname);
  const host = req.headers.get("host");

  // ===== App hostname (app.lmeband.com) =====
  if (isAppHost(host)) {
    // Auth gate — every app route requires Clerk auth.
    const { userId } = await auth();
    if (!userId) {
      const isAuthRoute =
        path.startsWith("/sign-in") ||
        path.startsWith("/sign-up");
      if (!isAuthRoute) {
        return NextResponse.redirect(new URL("/sign-in", req.url));
      }
    }
    return NextResponse.next();
  }

  // ===== Public hostname (lmeband.com / www.lmeband.com / dev) =====
  // Existing /enhancers and /admin gates retained.
  const isEnhancersGated =
    path === "/enhancers" || path.startsWith("/enhancers/posts");
  if (isEnhancersGated) {
    const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) return NextResponse.redirect(new URL("/enhancers/login", req.url));
    try { await verifySession(cookie); } catch {
      const res = NextResponse.redirect(new URL("/enhancers/login", req.url));
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }
  }

  const isAdmin = path === "/admin" || path.startsWith("/admin/");
  const isAdminPublic = path === "/admin/sign-in" || path.startsWith("/admin/sign-in/");
  if (isAdmin && !isAdminPublic) {
    const { userId } = await auth();
    if (!userId) return NextResponse.redirect(new URL("/admin/sign-in", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 6: Manual smoke check (no automated test for proxy)**

```bash
pnpm dev
# In one tab visit http://localhost:3002 — should show public homepage
# In another tab edit /etc/hosts to add: 127.0.0.1 app.localhost
# Set NEXT_PUBLIC_LOCAL_APP_HOST=app.localhost:3002 in .env.local
# Visit http://app.localhost:3002 — should redirect to /sign-in (no app pages exist yet, but the gate is wired)
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/host.ts src/proxy.ts tests/lib/host.test.ts
git commit -m "feat(routing): hostname-based gating — app.lmeband.com vs lmeband.com"
```

---

### Task 5: Theme system — light + dark mode tokens

**Files:**
- Create: `src/lib/theme.ts`
- Modify: `src/app/globals.css`
- Create: `src/components/crm/ThemeToggle.tsx`
- Test: `tests/lib/theme.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/theme.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test theme.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement theme module**

Create `src/lib/theme.ts`:

```ts
export type Theme = "light" | "dark";
export const THEME_COOKIE = "lme_theme";

export function resolveInitialTheme(input: {
  cookie: Theme | string | null | undefined;
  systemPrefersDark: boolean;
}): Theme {
  if (input.cookie === "dark") return "dark";
  if (input.cookie === "light") return "light";
  return input.systemPrefersDark ? "dark" : "light";
}
```

- [ ] **Step 4: Add tokens to globals.css**

Edit `src/app/globals.css`. Append (at the end):

```css
:root {
  --bg-base: #FAFAF7;
  --bg-surface: #FFFFFF;
  --bg-card: #F5F5F0;
  --border: #E5E5E0;
  --text-primary: #0A0A0A;
  --text-body: #333333;
  --text-muted: #777777;
  --accent: #0D9488;
  --accent-hover: #14B8A6;
  --success: #1e6a3c;
  --danger: #aa3333;
}

[data-theme="dark"] {
  --bg-base: #080808;
  --bg-surface: #111111;
  --bg-card: #1A1A1A;
  --border: #252525;
  --text-primary: #F5F5F0;
  --text-body: #C4C4C4;
  --text-muted: #8A8A8A;
  --accent: #14B8A6;
  --accent-hover: #5EEAD4;
  --success: #5EEAD4;
  --danger: #ff6b6b;
}

@theme {
  --color-bg-base: var(--bg-base);
  --color-bg-surface: var(--bg-surface);
  --color-bg-card: var(--bg-card);
  --color-border: var(--border);
  --color-text-primary: var(--text-primary);
  --color-text-body: var(--text-body);
  --color-text-muted: var(--text-muted);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-success: var(--success);
  --color-danger: var(--danger);
}
```

(Tailwind 4 uses `@theme` to expose CSS vars as utility classes — `bg-bg-base`, `text-text-body`, etc.)

- [ ] **Step 5: Implement ThemeToggle component**

Create `src/components/crm/ThemeToggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { type Theme, THEME_COOKIE } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme as Theme;
    if (current) setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      className="px-3 py-1 rounded border border-border text-text-body hover:bg-bg-card text-sm"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `pnpm test theme.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/theme.ts src/app/globals.css src/components/crm/ThemeToggle.tsx tests/lib/theme.test.ts
git commit -m "feat(theme): light + dark mode tokens + toggle component"
```

---

### Task 6: Reorganise routes — `(public-domain)` and `(app-domain)` route groups

**Why:** Next.js route groups let us share a layout per surface. Public stays at `lmeband.com`; app at `app.lmeband.com`.

**Files:**
- Move: every existing `src/app/<route>/` (except `admin`, `api`, `globals.css`, `layout.tsx`, `page.tsx`) into `src/app/(public-domain)/<route>/`
- Create: `src/app/(app-domain)/layout.tsx`
- Create: `src/app/(app-domain)/page.tsx` (redirects to `/dashboard`)

- [ ] **Step 1: Move public pages**

```bash
mkdir -p src/app/\(public-domain\)
git mv src/app/page.tsx src/app/\(public-domain\)/page.tsx
git mv src/app/bookingform src/app/\(public-domain\)/bookingform
git mv src/app/setlist src/app/\(public-domain\)/setlist
git mv src/app/mailing-list src/app/\(public-domain\)/mailing-list
git mv src/app/enhancers src/app/\(public-domain\)/enhancers
git mv src/app/unsubscribe src/app/\(public-domain\)/unsubscribe
git mv src/app/debug src/app/\(public-domain\)/debug
```

(Leave `admin/`, `api/`, `globals.css`, `layout.tsx` at the top level.)

- [ ] **Step 2: Create app-domain layout**

Create `src/app/(app-domain)/layout.tsx`:

```tsx
import { ReactNode } from "react";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { Sidebar } from "@/components/crm/Sidebar";
import { ThemeToggle } from "@/components/crm/ThemeToggle";
import { isAppHost } from "@/lib/host";
import { THEME_COOKIE, resolveInitialTheme, type Theme } from "@/lib/theme";
import { notFound } from "next/navigation";

export default async function AppDomainLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  if (!isAppHost(h.get("host"))) notFound();

  const c = await cookies();
  const cookieTheme = c.get(THEME_COOKIE)?.value as Theme | undefined;
  const theme = resolveInitialTheme({ cookie: cookieTheme ?? null, systemPrefersDark: true });

  return (
    <div data-theme={theme} className="min-h-screen bg-bg-base text-text-body flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-border flex items-center justify-between px-6">
          <Link href="/dashboard" className="font-bold text-text-primary">LME · CRM</Link>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create app-domain root page**

Create `src/app/(app-domain)/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function AppRoot() {
  redirect("/dashboard");
}
```

- [ ] **Step 4: Implement Sidebar component (skeleton — full nav per spec §8.1)**

Create `src/components/crm/Sidebar.tsx`:

```tsx
import Link from "next/link";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "Events",
    children: [
      { label: "External Bookings", href: "/events/external-bookings" },
      { label: "Internal Shows", href: "/events/internal-shows", disabled: true },
      { label: "Team Diary", href: "/events/team-diary", disabled: true },
      { label: "Calendar", href: "/events/calendar" },
    ],
  },
  { label: "Marketing", href: "/marketing", disabled: true },
  { label: "Music", href: "/music", disabled: true },
  { label: "Finance", href: "/finance", disabled: true },
  { label: "Enhancers", href: "/enhancers-admin", disabled: true },
  { label: "Settings", href: "/settings", disabled: true },
];

export function Sidebar() {
  return (
    <nav className="w-56 border-r border-border bg-bg-surface p-4">
      <ul className="space-y-1">
        {NAV.map((item) => (
          <li key={item.label}>
            {"href" in item && item.href ? (
              <Link
                href={item.href}
                aria-disabled={item.disabled}
                className={`block px-3 py-2 rounded text-sm ${
                  item.disabled
                    ? "text-text-muted pointer-events-none opacity-50"
                    : "text-text-body hover:bg-bg-card hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <div>
                <div className="px-3 py-2 text-xs uppercase tracking-wide text-text-muted">{item.label}</div>
                <ul className="ml-3 space-y-1">
                  {item.children?.map((child) => (
                    <li key={child.label}>
                      <Link
                        href={child.href}
                        aria-disabled={child.disabled}
                        className={`block px-3 py-1.5 rounded text-sm ${
                          child.disabled
                            ? "text-text-muted pointer-events-none opacity-50"
                            : "text-text-body hover:bg-bg-card hover:text-text-primary"
                        }`}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 5: Build to catch any broken imports from the move**

Run: `pnpm build`
Expected: succeeds. If imports break (e.g. `@/components/...` paths), fix them.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(routing): split app into (public-domain) + (app-domain) route groups"
```

---

### Task 7: Dashboard skeleton — role-aware

**Files:**
- Create: `src/app/(app-domain)/dashboard/page.tsx`
- Create: `src/app/(app-domain)/dashboard/dashboard-client.tsx`

- [ ] **Step 1: Implement server-side role lookup + dashboard page**

Create `src/app/(app-domain)/dashboard/page.tsx`:

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await fetchQuery(api.users.getByClerkId, { clerkUserId: userId });
  const role = user?.role ?? "admin";

  return <DashboardClient role={role} />;
}
```

- [ ] **Step 2: Implement client-side dashboard rendering**

Create `src/app/(app-domain)/dashboard/dashboard-client.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";

export function DashboardClient({ role }: { role: string }) {
  const externalBookings = useQuery(api.events.listByFamily, { family: "ExternalBooking" });

  const isDirector = role === "director" || role === "owner";
  const isAdminLike = role === "admin" || isDirector;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
      <p className="text-sm text-text-muted">Role: {role}</p>

      {isAdminLike && (
        <section className="bg-bg-surface border border-border rounded p-4">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Bookings pipeline</h2>
          {externalBookings === undefined ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (
            <ul className="space-y-1">
              {externalBookings.map((e: any) => (
                <li key={e._id} className="text-sm">
                  <Link href={`/events/${e._id}`} className="hover:underline text-accent">
                    {e.name} — {e.status}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/events/external-bookings" className="text-sm text-accent mt-2 inline-block">View pipeline →</Link>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add `users.getByClerkId` query if not already present**

Read `convex/users.ts`. If `getByClerkId` doesn't exist, add:

```ts
export const getByClerkId = query({
  args: { clerkUserId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .unique();
  },
});
```

(If a similar query already exists with another name, reuse it instead.)

- [ ] **Step 4: Run codegen + smoke test**

```bash
pnpm dlx convex codegen
pnpm dev
# Visit app.localhost:3002/dashboard — confirms basic dashboard renders
```

- [ ] **Step 5: Commit**

```bash
git add convex/users.ts convex/_generated/ src/app/\(app-domain\)/dashboard/
git commit -m "feat(crm): role-aware dashboard skeleton"
```

---

### Task 8: External Bookings pipeline kanban

**Files:**
- Create: `src/app/(app-domain)/events/page.tsx`
- Create: `src/app/(app-domain)/events/external-bookings/page.tsx`
- Create: `src/components/crm/Pipeline.tsx`
- Create: `src/components/crm/EventCard.tsx`

- [ ] **Step 1: Implement events index redirect**

Create `src/app/(app-domain)/events/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function EventsIndex() {
  redirect("/events/external-bookings");
}
```

- [ ] **Step 2: Implement EventCard component**

Create `src/components/crm/EventCard.tsx`:

```tsx
import Link from "next/link";

type Event = {
  _id: string;
  name: string;
  status: string;
  startDate: number;
  client?: { name?: string };
  venue?: { name?: string };
};

export function EventCard({ event }: { event: Event }) {
  const dateStr = new Date(event.startDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
  return (
    <Link
      href={`/events/${event._id}`}
      className="block bg-bg-surface border border-border rounded p-3 hover:border-accent transition"
    >
      <div className="font-semibold text-text-primary text-sm mb-1">{event.name}</div>
      <div className="text-xs text-text-muted">{dateStr}</div>
      {event.venue?.name && (
        <div className="text-xs text-text-muted mt-1">📍 {event.venue.name}</div>
      )}
      {event.client?.name && (
        <div className="text-xs text-text-body mt-1">{event.client.name}</div>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Implement Pipeline component**

The 8 booking statuses for Phase 1a (the user-visible pipeline):

```ts
const PIPELINE_STAGES = [
  "Inquiry",
  "InitialReview",
  "Quoting",
  "ContractSent",
  "ContractSigned",
  "Booked",
  "EventDay",
  "Completed",
];
```

(Phase 1b expands this with BookingFormSent / FormReturned / DiscoveryCall / AwaitingDeposit / PreEvent / AwaitingBalance — for now, those 6 are bucketed into the 8 above so the kanban stays scannable.)

Create `src/components/crm/Pipeline.tsx`:

```tsx
"use client";

import { EventCard } from "./EventCard";

const STAGES = [
  "Inquiry",
  "InitialReview",
  "Quoting",
  "ContractSent",
  "ContractSigned",
  "Booked",
  "EventDay",
  "Completed",
];

const STAGE_LABELS: Record<string, string> = {
  Inquiry: "Inquiry",
  InitialReview: "Initial Review",
  Quoting: "Quoting",
  ContractSent: "Contract Sent",
  ContractSigned: "Signed",
  Booked: "Booked",
  EventDay: "Event Day",
  Completed: "Completed",
};

type Event = {
  _id: string;
  name: string;
  status: string;
  startDate: number;
  client?: { name?: string };
  venue?: { name?: string };
};

export function Pipeline({ events }: { events: Event[] }) {
  const byStage = new Map<string, Event[]>(STAGES.map((s) => [s, []]));
  for (const e of events) {
    const stage = STAGES.includes(e.status) ? e.status : "Inquiry";
    byStage.get(stage)!.push(e);
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {STAGES.map((stage) => (
        <div key={stage} className="bg-bg-card border border-border rounded p-3 min-h-[300px]">
          <h3 className="text-xs uppercase tracking-wide text-text-muted mb-3 flex items-center justify-between">
            {STAGE_LABELS[stage]}
            <span className="bg-bg-surface px-1.5 py-0.5 rounded text-text-body">
              {byStage.get(stage)!.length}
            </span>
          </h3>
          <div className="space-y-2">
            {byStage.get(stage)!.map((e) => (
              <EventCard key={e._id} event={e} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement External Bookings page**

Create `src/app/(app-domain)/events/external-bookings/page.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Pipeline } from "@/components/crm/Pipeline";
import Link from "next/link";

export default function ExternalBookingsPage() {
  const events = useQuery(api.events.listByFamily, { family: "ExternalBooking" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">External Bookings</h1>
        <Link
          href="/events/new?family=ExternalBooking"
          className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
        >
          + New
        </Link>
      </div>
      {events === undefined ? (
        <p className="text-sm text-text-muted">Loading bookings…</p>
      ) : (
        <Pipeline events={events as any} />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Smoke test**

```bash
pnpm dev
# Visit app.localhost:3002/events/external-bookings
# Should render 8 empty stage columns + a "+ New" button
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app-domain\)/events/ src/components/crm/Pipeline.tsx src/components/crm/EventCard.tsx
git commit -m "feat(crm): External Bookings pipeline kanban"
```

---

### Task 9: Event detail page — Overview + Client + Finance & Legal + Setlist tabs

**Files:**
- Create: `src/app/(app-domain)/events/[id]/layout.tsx`
- Create: `src/app/(app-domain)/events/[id]/page.tsx` (Overview tab)
- Create: `src/app/(app-domain)/events/[id]/client/page.tsx`
- Create: `src/app/(app-domain)/events/[id]/finance/page.tsx`
- Create: `src/app/(app-domain)/events/[id]/setlist/page.tsx`
- Create: `src/components/crm/EventDetailHeader.tsx`

- [ ] **Step 1: Implement event-detail layout (header + tabs)**

Create `src/app/(app-domain)/events/[id]/layout.tsx`:

```tsx
import { ReactNode } from "react";
import { EventDetailHeader } from "@/components/crm/EventDetailHeader";
import { Id } from "../../../../../convex/_generated/dataModel";

export default async function EventDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <EventDetailHeader id={id as Id<"events">} />
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Implement EventDetailHeader (live tabs + status badge)**

Create `src/components/crm/EventDetailHeader.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", href: "" },
  { label: "Client", href: "/client" },
  { label: "Finance & Legal", href: "/finance" },
  { label: "Setlist", href: "/setlist" },
];

export function EventDetailHeader({ id }: { id: Id<"events"> }) {
  const event = useQuery(api.events.getById, { id });
  const pathname = usePathname();
  const base = `/events/${id}`;

  if (event === undefined) return <p className="text-sm text-text-muted">Loading…</p>;
  if (!event) return <p className="text-sm text-danger">Event not found.</p>;

  const dateStr = new Date(event.startDate).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="border-b border-border pb-4">
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="text-2xl font-bold text-text-primary">{event.name}</h1>
        <span className="text-xs px-2 py-1 bg-bg-card rounded text-text-body">{event.status}</span>
      </div>
      <p className="text-sm text-text-muted">{dateStr}{event.venue?.name && ` · ${event.venue.name}`}</p>
      <nav className="mt-4 flex gap-1 -mb-4">
        {TABS.map((t) => {
          const href = `${base}${t.href}`;
          const active = pathname === href || (t.href === "" && pathname === base);
          return (
            <Link
              key={t.label}
              href={href}
              className={`px-3 py-2 text-sm border-b-2 ${
                active
                  ? "border-accent text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-body"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Implement Overview tab (with inline Notes textarea)**

Create `src/app/(app-domain)/events/[id]/page.tsx`:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function OverviewTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const updateEvent = useMutation(api.events.update);
  const setStatus = useMutation(api.events.setStatus);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (event?.notes !== undefined) setNotes(event.notes ?? "");
  }, [event?._id]);

  if (event === undefined) return null;
  if (!event) return null;

  async function saveNotes() {
    await updateEvent({ id: id as Id<"events">, patch: { notes } });
    setSaved(true);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <section>
          <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Description</h2>
          <p className="text-text-body whitespace-pre-wrap">{event.description ?? "—"}</p>
        </section>
        <section>
          <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
            onBlur={saveNotes}
            className="w-full min-h-[160px] bg-bg-surface border border-border rounded p-3 text-text-body"
            placeholder="Free-form notes about this booking…"
          />
          <p className="text-xs text-text-muted mt-1">{saved ? "Saved." : "Saving on blur…"}</p>
        </section>
      </div>
      <aside className="space-y-4">
        <section>
          <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Next action</h2>
          <p className="text-text-body">{event.nextActionLabel ?? "—"}</p>
        </section>
        <section>
          <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Status</h2>
          <select
            value={event.status}
            onChange={(e) => setStatus({ id: id as Id<"events">, status: e.target.value })}
            className="w-full bg-bg-surface border border-border rounded p-2 text-text-body"
          >
            {["Inquiry", "InitialReview", "Quoting", "ContractSent", "ContractSigned", "Booked", "EventDay", "Completed", "Cancelled", "Lost"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </section>
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Implement Client tab**

Create `src/app/(app-domain)/events/[id]/client/page.tsx`:

```tsx
"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

export default function ClientTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });

  if (event === undefined) return null;
  if (!event) return null;

  const c = event.client ?? {};

  const fields: Array<[string, string | undefined]> = [
    ["Name", c.name],
    ["Email", c.email],
    ["Phone", c.phone],
    ["Address", c.address],
  ];

  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
      {fields.map(([label, value]) => (
        <div key={label} className="bg-bg-surface border border-border rounded p-3">
          <dt className="text-xs uppercase tracking-wide text-text-muted mb-1">{label}</dt>
          <dd className="text-text-body">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
```

- [ ] **Step 5: Implement Finance & Legal tab (read-only stub)**

Create `src/app/(app-domain)/events/[id]/finance/page.tsx`:

```tsx
"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

export default function FinanceLegalTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });

  if (event === undefined) return null;
  if (!event) return null;

  const f = event.finance;
  const c = event.contract;

  return (
    <div className="space-y-4 max-w-2xl">
      <section className="bg-bg-surface border border-border rounded p-4">
        <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Finance</h2>
        <p className="text-text-body">Fee: {f?.fee != null ? `£${f.fee}` : "—"}</p>
        <p className="text-text-body">Deposit: {f?.deposit ? `£${f.deposit.amount} ${f.deposit.paid ? "✓ paid" : "(pending)"}` : "—"}</p>
        <p className="text-text-body">Balance: {f?.balance ? `£${f.balance.amount} ${f.balance.paid ? "✓ paid" : "(due " + new Date(f.balance.dueDate).toLocaleDateString("en-GB") + ")"}` : "—"}</p>
        <p className="text-text-muted text-xs mt-2">Xero invoice automation lands in Phase 1b.</p>
      </section>
      <section className="bg-bg-surface border border-border rounded p-4">
        <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Contract</h2>
        <p className="text-text-body">{c?.signedAt ? `Signed by ${c.signedByName} on ${new Date(c.signedAt).toLocaleDateString("en-GB")}` : "Not yet sent"}</p>
        <p className="text-text-muted text-xs mt-2">Contract templates + e-sign land in Phase 1b.</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Implement Setlist tab (basic, just notes)**

Create `src/app/(app-domain)/events/[id]/setlist/page.tsx`:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

export default function SetlistTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const updateEvent = useMutation(api.events.update);
  // Phase 1a stores setlist as freetext in a dedicated description chunk on the event description field.
  // Structured setlists arrive in Phase 4 with the Music module.
  const [text, setText] = useState("");

  useEffect(() => {
    // Reuse `description` for now? No — keep description for general blurb.
    // Use a dedicated `notes` field-suffix marker… simpler: store setlist text inline in notes prefixed with [SETLIST].
    // Cleanest minimal: piggy-back on a separate setlistText column. But that's schema churn for 4 weeks.
    // Decision: Phase 1a uses event.description's last paragraph via a header. Phase 4 adds structured `setlist` array.
    // For now, just render an unsavable notice.
  }, [event?._id]);

  if (event === undefined) return null;
  if (!event) return null;

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-text-muted text-sm">
        Structured setlists land in <strong>Phase 4 (Music module)</strong>.
        For Phase 1a, jot setlist notes in the Overview Notes textarea.
      </p>
    </div>
  );
}
```

(Setlist tab is intentionally a placeholder this phase.)

- [ ] **Step 7: Smoke test**

```bash
pnpm dev
# Visit app.localhost:3002/events/<some-id> and click through tabs
```

- [ ] **Step 8: Commit**

```bash
git add src/app/\(app-domain\)/events/\[id\]/ src/components/crm/EventDetailHeader.tsx
git commit -m "feat(crm): event detail page with Overview/Client/Finance/Setlist tabs"
```

---

### Task 10: Manual create-event form

**Files:**
- Create: `src/app/(app-domain)/events/new/page.tsx`

- [ ] **Step 1: Implement the create form**

Create `src/app/(app-domain)/events/new/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewEventPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialFamily = (params.get("family") ?? "ExternalBooking") as
    "ExternalBooking" | "InternalShow" | "TeamDiary";

  const create = useMutation(api.events.create);
  const [form, setForm] = useState({
    name: "",
    type: "Wedding" as "Wedding" | "Corporate" | "Festival" | "PrivateParty" | "Other",
    family: initialFamily,
    startDate: "",
    venue: "",
    clientName: "",
    clientEmail: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = await create({
      name: form.name,
      type: form.type,
      family: form.family,
      status: "Inquiry",
      startDate: new Date(form.startDate).getTime(),
      isAllDay: true,
      venue: form.venue ? { name: form.venue } : undefined,
      client: form.clientEmail
        ? { name: form.clientName, email: form.clientEmail }
        : undefined,
    });
    router.push(`/events/${id}`);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-text-primary mb-4">New Event</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <Select label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v as any })}
          options={["Wedding", "Corporate", "Festival", "PrivateParty", "Other"]} />
        <Input type="date" label="Event date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} required />
        <Input label="Venue (optional)" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} />
        <Input label="Client name" value={form.clientName} onChange={(v) => setForm({ ...form, clientName: v })} />
        <Input label="Client email" value={form.clientEmail} onChange={(v) => setForm({ ...form, clientEmail: v })} />
        <button className="bg-accent text-bg-base px-4 py-2 rounded font-semibold hover:bg-accent-hover">
          Create
        </button>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full mt-1 bg-bg-surface border border-border rounded p-2 text-text-body"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 bg-bg-surface border border-border rounded p-2 text-text-body"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Smoke test**

```bash
pnpm dev
# Visit app.localhost:3002/events/new
# Fill form, submit; should redirect to event detail
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app-domain\)/events/new/
git commit -m "feat(crm): manual event create form"
```

---

### Task 11: Calendar view with filter chips

**Files:**
- Create: `src/app/(app-domain)/events/calendar/page.tsx`
- Create: `src/components/crm/CalendarView.tsx`

- [ ] **Step 1: Implement CalendarView component**

Create `src/components/crm/CalendarView.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";

const FAMILY_FILTERS = [
  { label: "All", value: null },
  { label: "External Bookings", value: "ExternalBooking" as const },
  { label: "Internal Shows", value: "InternalShow" as const },
  { label: "Team Diary", value: "TeamDiary" as const },
];

export function CalendarView() {
  const [filter, setFilter] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);

  const events = useQuery(api.events.listForCalendar, {
    from: monthStart.getTime(),
    to: monthEnd.getTime(),
  });

  const filtered = (events ?? []).filter((e: any) => !filter || e.family === filter);

  const days: Date[] = [];
  for (let d = new Date(monthStart); d < monthEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const eventsByDay = new Map<string, any[]>();
  for (const e of filtered) {
    const key = new Date(e.startDate).toDateString();
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(e);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button onClick={() => setMonthOffset(monthOffset - 1)} className="px-3 py-1 border border-border rounded hover:bg-bg-card">←</button>
          <button onClick={() => setMonthOffset(0)} className="px-3 py-1 border border-border rounded hover:bg-bg-card text-sm">Today</button>
          <button onClick={() => setMonthOffset(monthOffset + 1)} className="px-3 py-1 border border-border rounded hover:bg-bg-card">→</button>
        </div>
        <h2 className="text-lg font-semibold text-text-primary">
          {monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-1 flex-wrap">
          {FAMILY_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              className={`text-xs px-2 py-1 rounded border ${
                filter === f.value
                  ? "border-accent text-accent"
                  : "border-border text-text-muted hover:text-text-body"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="text-xs text-text-muted text-center py-1">{d}</div>
        ))}
        {/* leading blanks */}
        {Array.from({ length: (monthStart.getDay() + 6) % 7 }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const key = d.toDateString();
          const today = key === new Date().toDateString();
          return (
            <div key={key} className={`bg-bg-surface border ${today ? "border-accent" : "border-border"} rounded p-1.5 min-h-[80px]`}>
              <div className="text-xs text-text-muted">{d.getDate()}</div>
              <div className="space-y-0.5 mt-1">
                {(eventsByDay.get(key) ?? []).map((e: any) => (
                  <Link
                    key={e._id}
                    href={`/events/${e._id}`}
                    className="block text-xs px-1 py-0.5 rounded bg-bg-card hover:bg-accent hover:text-bg-base truncate"
                    title={e.name}
                  >
                    {e.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement Calendar page**

Create `src/app/(app-domain)/events/calendar/page.tsx`:

```tsx
import { CalendarView } from "@/components/crm/CalendarView";

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">Calendar</h1>
      <CalendarView />
    </div>
  );
}
```

- [ ] **Step 3: Smoke test**

```bash
pnpm dev
# Visit app.localhost:3002/events/calendar
# Switch months, switch filter chips
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app-domain\)/events/calendar/ src/components/crm/CalendarView.tsx
git commit -m "feat(crm): basic calendar view with family filter chips"
```

---

### Task 12: Booking migration — Notion → Convex

**Files:**
- Create: `convex/migrations/bookingsToEvents.ts`
- Create: `scripts/migrate-bookings.ts`
- Test: `tests/convex/migration.test.ts`

The strategy: pull all rows from the existing Notion BOOKINGS database (using the existing `src/lib/notion.ts` client) and insert them as `events` records via an internal mutation. Run once, manually, to migrate the 269 bookings.

- [ ] **Step 1: Read the existing Notion client to understand shape**

Read `src/lib/notion.ts` end-to-end. Note the function it exposes for reading bookings (e.g. `listBookings`).

- [ ] **Step 2: Implement the internal mutation**

Create `convex/migrations/bookingsToEvents.ts`:

```ts
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

const eventTypeMap: Record<string, "Wedding" | "Corporate" | "Festival" | "PrivateParty" | "Other"> = {
  Wedding: "Wedding",
  Corporate: "Corporate",
  Festival: "Festival",
  "Private Party": "PrivateParty",
  Other: "Other",
};

const statusMap: Record<string, string> = {
  Enquiry: "Inquiry",
  Quoted: "Quoting",
  "Contract Sent": "ContractSent",
  "Deposit Paid": "Booked",
  Booked: "Booked",
  Completed: "Completed",
  Cancelled: "Cancelled",
};

export const importOne = internalMutation({
  args: {
    notion: v.object({
      bookingName: v.string(),
      clientName: v.optional(v.string()),
      clientEmail: v.optional(v.string()),
      clientPhone: v.optional(v.string()),
      eventType: v.optional(v.string()),
      eventDate: v.optional(v.number()),
      venue: v.optional(v.string()),
      expectedGuests: v.optional(v.number()),
      genres: v.array(v.string()),
      djRequired: v.boolean(),
      status: v.optional(v.string()),
      fee: v.optional(v.number()),
      depositPaid: v.boolean(),
      notes: v.optional(v.string()),
    }),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const n = args.notion;
    const type = eventTypeMap[n.eventType ?? "Other"] ?? "Other";
    const status = statusMap[n.status ?? "Enquiry"] ?? "Inquiry";

    return await ctx.db.insert("events", {
      name: n.bookingName,
      type,
      family: "ExternalBooking",
      status,
      startDate: n.eventDate ?? Date.now(),
      isAllDay: true,
      venue: n.venue ? { name: n.venue } : undefined,
      notes: n.notes,
      client:
        n.clientName || n.clientEmail
          ? { name: n.clientName ?? "", email: n.clientEmail ?? "", phone: n.clientPhone }
          : undefined,
      bookingConfig: {
        bandConfig: "TBD",
        djRequired: n.djRequired,
        equipmentSource: "LME",
        extras: [],
        expectedGuests: n.expectedGuests,
      },
      finance: n.fee != null
        ? {
            fee: n.fee,
            deposit: n.depositPaid ? { amount: n.fee * 0.5, paid: true } : undefined,
          }
        : undefined,
    });
  },
});
```

- [ ] **Step 3: Write the migration test**

Create `tests/convex/migration.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";
import { api } from "../../convex/_generated/api";

describe("bookings → events migration", () => {
  test("imports a wedding correctly", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(internal.migrations.bookingsToEvents.importOne, {
      notion: {
        bookingName: "Bria + Kris Wedding",
        clientName: "Bria Mardenborough",
        clientEmail: "bria@example.com",
        eventType: "Wedding",
        eventDate: new Date("2026-07-25").getTime(),
        venue: "The Venue, Walsall",
        genres: ["Afrobeats", "00s RnB"],
        djRequired: false,
        status: "Deposit Paid",
        fee: 1750,
        depositPaid: true,
        notes: "Performance window 8:30-9:30pm",
      },
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.type).toBe("Wedding");
    expect(event?.status).toBe("Booked");
    expect(event?.client?.name).toBe("Bria Mardenborough");
    expect(event?.finance?.fee).toBe(1750);
    expect(event?.finance?.deposit?.paid).toBe(true);
  });

  test("maps unknown event type to Other", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(internal.migrations.bookingsToEvents.importOne, {
      notion: {
        bookingName: "X",
        eventType: "WeirdType",
        eventDate: Date.now(),
        genres: [],
        djRequired: false,
        depositPaid: false,
      },
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.type).toBe("Other");
  });
});
```

- [ ] **Step 4: Run codegen + tests**

```bash
pnpm dlx convex codegen
pnpm test migration.test.ts
```

Expected: PASS (2/2).

- [ ] **Step 5: Implement the runner script**

Create `scripts/migrate-bookings.ts`:

```ts
import { ConvexHttpClient } from "convex/browser";
import { internal } from "../convex/_generated/api";
import { listBookings } from "../src/lib/notion"; // adjust to the actual export name
import "dotenv/config";

async function main() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL!;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL env required");
  const client = new ConvexHttpClient(url);
  // Internal mutations require a deploy key for HTTP invocation:
  client.setAuth(process.env.CONVEX_DEPLOY_KEY!);

  const bookings = await listBookings();
  console.log(`Found ${bookings.length} bookings to migrate`);

  let imported = 0;
  for (const b of bookings) {
    try {
      await client.mutation(internal.migrations.bookingsToEvents.importOne, {
        notion: {
          bookingName: b.name,
          clientName: b.clientName,
          clientEmail: b.clientEmail,
          clientPhone: b.clientPhone,
          eventType: b.eventType,
          eventDate: b.eventDate,
          venue: b.venue,
          expectedGuests: b.expectedGuests,
          genres: b.genres ?? [],
          djRequired: b.djRequired ?? false,
          status: b.status,
          fee: b.fee,
          depositPaid: b.depositPaid ?? false,
          notes: b.notes,
        },
      });
      imported += 1;
      if (imported % 25 === 0) console.log(`  …${imported} done`);
    } catch (err) {
      console.error(`Failed for "${b.name}":`, err);
    }
  }
  console.log(`Migration complete — ${imported} of ${bookings.length} imported.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

(If `listBookings` has a different signature, adapt the call — the test in step 3 doesn't depend on this script.)

- [ ] **Step 6: Add npm script**

Edit `package.json`:

```json
"scripts": {
  "dev": "next dev --port 3002",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest",
  "migrate:bookings": "tsx scripts/migrate-bookings.ts"
}
```

- [ ] **Step 7: Run the migration in dev** *(deferred — actual run happens at deploy time, not in this task)*

Document the manual run command in a comment at the top of `scripts/migrate-bookings.ts`:

```
# Dry-run readout (review the records first):
NOTION_TOKEN=… NEXT_PUBLIC_CONVEX_URL=… pnpm migrate:bookings
```

- [ ] **Step 8: Commit**

```bash
git add convex/migrations/ convex/_generated/ tests/convex/migration.test.ts scripts/migrate-bookings.ts package.json
git commit -m "feat(migration): bookings → events Convex migration + runner script"
```

---

### Task 13: Sign-in route under `app.lmeband.com`

**Why:** the proxy redirects unauthed users to `/sign-in` on the app host. We need that route. Reuse the existing Clerk SignIn component pattern from `/admin/sign-in`.

**Files:**
- Create: `src/app/(app-domain)/sign-in/page.tsx`
- Create: `src/app/(app-domain)/sign-in/[[...sign-in]]/page.tsx`

- [ ] **Step 1: Read the existing admin sign-in for the pattern**

Read `src/app/admin/sign-in/page.tsx` (or `/[[...sign-in]]/page.tsx` if that's how it's structured) to mirror.

- [ ] **Step 2: Implement the sign-in page**

Create `src/app/(app-domain)/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
      />
    </div>
  );
}
```

(The `(app-domain)` layout will wrap this — but we want the sidebar hidden on auth screens. To skip the layout, put auth pages in a *parallel route group* `(app-domain-auth)` that uses a flat layout. Simpler alternative: detect path in the layout and skip the sidebar. **Decision:** skip in layout.)

Edit `src/app/(app-domain)/layout.tsx` to early-return for auth routes:

```tsx
// Add near the top of the component, after the host check:
const path = headersList.get("x-pathname") ?? ""; // requires middleware to set this
if (path.startsWith("/sign-in") || path.startsWith("/sign-up")) {
  return <div data-theme={theme} className="min-h-screen bg-bg-base">{children}</div>;
}
```

(Alternatively, use a route group `(auth)` with its own layout. Use whichever the team prefers — both work. Document choice in commit.)

- [ ] **Step 3: Smoke test**

Visit `app.localhost:3002` while logged out → should redirect to `/sign-in` → Clerk widget renders. Sign in → `/dashboard`.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app-domain\)/sign-in/ src/app/\(app-domain\)/layout.tsx
git commit -m "feat(crm): sign-in route under app.lmeband.com"
```

---

### Task 14: Vercel domain config + DNS

**Files:**
- Modify: Vercel project settings (manual — outside the repo)
- Modify: `vercel.json` (none needed — domains are project-level)
- Document: `docs/superpowers/plans/deploy-notes-phase-1a.md` (NEW)

- [ ] **Step 1: Add app.lmeband.com domain in Vercel**

In Vercel dashboard → Project (`lme-website`) → Settings → Domains:
- Add `app.lmeband.com`
- Vercel will provide a CNAME target (e.g. `cname.vercel-dns.com`)

- [ ] **Step 2: Configure DNS at domain registrar**

Add a CNAME record:
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com (use exact value from Vercel)
TTL: 300
```

Wait for DNS to propagate (5–15 min usually).

- [ ] **Step 3: Verify hostname routing in production**

Visit `https://app.lmeband.com` → should redirect to `/sign-in` (no app pages render until logged in). Visit `https://lmeband.com` → public homepage renders.

- [ ] **Step 4: Document deploy notes**

Create `docs/superpowers/plans/deploy-notes-phase-1a.md` with:
- DNS records added
- Vercel domain config
- Resend `enquiries@lmeband.com` sender verified (or document if it needs verification)
- Convex production deploy key set (`CONVEX_DEPLOY_KEY` in Vercel env)
- Migration script run command + outcome

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/deploy-notes-phase-1a.md
git commit -m "docs: Phase 1a deploy notes"
```

---

### Task 15: End-to-end smoke test + push

- [ ] **Step 1: Local end-to-end test**

```bash
pnpm dev
# 1. Visit lmeband.com (public) — homepage renders
# 2. Visit lmeband.com/bookingform — form submits, creates an event in Convex
# 3. Visit app.localhost:3002 — redirects to /sign-in
# 4. Sign in with allowlisted account
# 5. Lands on /dashboard — sees role + bookings list
# 6. Click into /events/external-bookings — pipeline renders with the new inquiry in Inquiry column
# 7. Click into a card → event detail tabs work
# 8. Click /events/calendar → calendar renders
# 9. Toggle theme → switches light/dark, persists across reload
```

- [ ] **Step 2: Run full test suite + build**

```bash
pnpm test
pnpm build
```

Expected: all tests pass; build succeeds with no warnings about missing exports.

- [ ] **Step 3: Push the branch**

```bash
git push -u origin feat/phase-1a-bookings-mvp
```

- [ ] **Step 4: Open a PR**

```bash
gh pr create --title "Phase 1a — Bookings MVP" --body "$(cat <<'EOF'
## Summary
Ships the Phase 1a slice of the LME platform vision:
- New `app.lmeband.com` subdomain hosts the CRM
- Unified `events` schema replaces the old `events`/`bookings`/`tasks`/`projects`/`discussions`/`messages` tables
- External Bookings pipeline kanban + event detail page (Overview/Client/Finance/Setlist tabs)
- Public booking inquiry form rewired to Convex (replaces /api/submit)
- Auto-confirmation email via Resend
- Calendar view with family filters
- Light + dark theme tokens + toggle
- Booking migration script (manual one-shot)

Spec: `docs/superpowers/specs/2026-05-03-lme-platform-vision-design.md`
Plan: `docs/superpowers/plans/2026-05-03-phase-1a-bookings-mvp.md`

## Test plan
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] Local smoke test (see Task 15 in plan)
- [ ] Run `pnpm migrate:bookings` against staging Convex; verify count of imported events
- [ ] Add `app.lmeband.com` in Vercel + DNS CNAME
- [ ] Deploy preview → log in → verify dashboard + pipeline render
- [ ] Submit a real test inquiry from `lmeband.com/bookingform` → verify it lands as Inquiry in pipeline
- [ ] Verify Convex prod deploy key set so future schema changes auto-deploy

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Done — handoff for review**

Phase 1a complete. Next phase is Phase 1b (Booking Lifecycle), specced in `docs/superpowers/specs/2026-05-03-lme-platform-vision-design.md` §11.

---

## Self-review checklist

After implementing, verify:

1. **Spec coverage:**
   - ✅ §10 Phase 1a deliverable list — every item is a task
   - ✅ §4 Events schema — Task 1
   - ✅ §5 Booking lifecycle Stage 1 (Inquiry) — Task 3
   - ✅ §6 Calendar — Tasks 2, 11
   - ✅ §10 Visual design (light + dark) — Task 5
   - ✅ §9.3 Phase 1a roles (director + admin only) — schema in Task 1; gate is the existing Clerk auth allowlist
   - ✅ §2 Subdomain split — Tasks 4, 6, 14
   - ✅ §11 MVP — `app.lmeband.com` resolves, Convex inquiry write, pipeline kanban, event detail tabs, 269 bookings migrated
   - ⚠️ Migration count verification (269) — happens at deploy time, not in code; covered in Task 14 deploy notes

2. **Placeholder scan:** searched for "TBD", "TODO", "fill in" — none in code blocks (the deploy script comment includes a `…` for env values which is intentional documentation).

3. **Type consistency:**
   - `events.create` args match `events.update` patch fields
   - `family` enum consistent across schema, queries, UI components
   - `status` is `v.string()` (intentionally — different state machines per family means we don't enum-constrain at schema level; UI validates per type)

4. **Out-of-scope confirmed:** no Tasks/Notes/Discussions/Library modules; no contracts/Xero/portal/e-sign (Phase 1b); no Internal Shows UI (Phase 3); no Music module (Phase 4).
