# LME Platform Vision — Design Spec

**Date:** 2026-05-03
**Status:** Draft for review
**Author:** Khari + Claude
**Related plans:** TBD (will be created from this spec, phase by phase)

---

## 1. Vision

LME currently runs on a stack of: a public Next.js site (lmeband.com), an admin sub-app at `/admin/*`, Convex for new data, Notion for everything else, MailChimp (now retired) for email, Dropbox for files, Xero for invoicing, Skiddle and Eventbrite for ticketing, and WhatsApp for chat. The new platform unifies the operational layer of this — bookings, projects, marketing, finance, music — into a single internal CRM at **`app.lmeband.com`**, while keeping the public marketing site at **`lmeband.com`**. Notion retires across phases. Xero, Eventbrite, Dropbox, and WhatsApp stay as canonical sources for what they do best; the CRM integrates with them rather than replacing them.

The platform is built for six band members with distinct daily workflows (Khari ops/finance/system-owner, Chris sales/marketing, Reuben music direction, Justin merch, Tanisha admin, Stacey internal events) and exposes a magic-linked client portal for clients with active bookings.

## 2. Architecture decision: one repo, two hostnames

Single Next.js codebase, two public surfaces:

- **`lmeband.com`** — public marketing site, fan area (`/enhancers`), booking inquiry form, mailing-list capture, setlist, unsubscribe
- **`app.lmeband.com`** — internal CRM (the work described in this spec)
- **`app.lmeband.com/c/:slug/:token`** — magic-linked client portal (per booking, scoped read-only access)

Hostname routing in `src/proxy.ts` resolves which surface renders. Convex schema, Clerk auth, brand assets, types, and components are shared. **Decision rationale:** for a 2-developer team, splitting into 2 repos costs more (duplicate brand kit, separate Convex type sharing, two deploy pipelines, two Clerk webhooks) than it saves. Splitting later is straightforward if needed.

**Open item (deploy-time):** final domain choice is one of `app.lmeband.com` (working assumption), `lmeband.app`, or moving to `lme.band` + `app.lme.band`. Architecture is identical across all three.

## 3. Module map (top-level navigation)

The CRM has **11 top-level modules**. Ticketing, Sponsorships, and Contracts intentionally are NOT top-level — they only exist in the context of a specific engagement and live as tabs on engagement detail pages.

| # | Module | Status | Primary user(s) |
|---|---|---|---|
| 1 | **Dashboard** | Built (basic) | Everyone (role-aware) |
| 2 | **Engagements** | New | Tanisha (bookings), Stacey (events), Khari (all) |
| 3 | **Tasks** | New | Everyone |
| 4 | **Marketing** | Built (Compose/Campaigns/Contacts) — needs v2 | Chris (primary), Khari |
| 5 | **Music** | New | Reuben (primary), band |
| 6 | **Library** | New | Everyone (Chris + Justin most) |
| 7 | **Notes** | New | Everyone |
| 8 | **Discussions** | New | Chris (champion), everyone |
| 9 | **Finance** | New (Xero-backed) | Khari |
| 10 | **Enhancers** | Built (partial) | Khari, Chris |
| 11 | **Team** | Built | Khari |

## 4. The unified Engagement model

This is the foundational data decision. Notion's BOOKINGS + PROJECTS + CALENDAR collapse into **one `engagements` table** with a type discriminator and optional sub-blocks rendered conditionally in the UI.

### 4.1 Engagement types

| Type | Examples | Family |
|---|---|---|
| `Wedding` | Bria + Kris Wedding | Client booking |
| `Corporate` | Brand launch, conference | Client booking |
| `Festival` | Festival slot | Client booking |
| `PrivateParty` | Birthday, anniversary | Client booking |
| `Other` | Anything else paid | Client booking |
| `MainShow` | Summer Show, EOY Show | Internal event |
| `PopUp` | Mamas Saturday Night, venue collab | Internal event |
| `ContentShoot` | Photoshoot, music video | Internal event |
| `Meeting` | Sunday Catchup, sync | Operational |
| `Rehearsal` | Programmed practice | Operational |
| `Social` | Team dinner, retreat | Operational |

### 4.2 Schema sketch (Convex)

```ts
engagements: defineTable({
  // ===== Spine — every engagement =====
  name: v.string(),
  type: v.union(
    v.literal("Wedding"), v.literal("Corporate"), v.literal("Festival"),
    v.literal("PrivateParty"), v.literal("Other"),
    v.literal("MainShow"), v.literal("PopUp"), v.literal("ContentShoot"),
    v.literal("Meeting"), v.literal("Rehearsal"), v.literal("Social"),
  ),
  status: v.string(), // type-specific lifecycle (see 4.3)
  startDate: v.number(),     // ms epoch
  endDate: v.optional(v.number()),
  isAllDay: v.boolean(),
  venue: v.optional(v.object({
    name: v.string(),
    address: v.optional(v.string()),
    capacity: v.optional(v.number()),
    contact: v.optional(v.string()),
  })),
  leadOwner: v.optional(v.id("users")),
  attendees: v.optional(v.array(v.id("users"))), // who is "scheduled" — drives personal iCal export
  description: v.optional(v.string()),
  parentEngagementId: v.optional(v.id("engagements")), // for sub-events: rehearsals → MainShow, content shoots → MainShow campaign, etc.
  coverImage: v.optional(v.string()),

  // ===== Optional sub-blocks =====
  client: v.optional(v.object({              // client booking types only
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
  })),

  bookingConfig: v.optional(v.object({       // captured in Phase 1b booking form
    bandConfig: v.string(),                   // "5-piece", "4-piece", etc.
    djRequired: v.boolean(),
    equipmentSource: v.union(v.literal("LME"), v.literal("Venue"), v.literal("Mixed")),
    extras: v.array(v.string()),              // staging, production, etc.
    expectedGuests: v.optional(v.number()),
  })),

  finance: v.optional(v.object({             // client booking types
    fee: v.optional(v.number()),
    deposit: v.optional(v.object({ amount: v.number(), paid: v.boolean(), paidAt: v.optional(v.number()) })),
    balance: v.optional(v.object({ amount: v.number(), dueDate: v.number(), paid: v.boolean(), paidAt: v.optional(v.number()) })),
    xeroDepositInvoiceRef: v.optional(v.string()),
    xeroBalanceInvoiceRef: v.optional(v.string()),
  })),

  contract: v.optional(v.object({            // client booking types
    templateId: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    signedAt: v.optional(v.number()),
    signedByName: v.optional(v.string()),
    auditLog: v.array(v.object({ ts: v.number(), action: v.string(), ip: v.optional(v.string()) })),
  })),

  ticketing: v.optional(v.object({           // MainShow, PopUp (light)
    platform: v.union(v.literal("Eventbrite"), v.literal("Skiddle"), v.literal("None")),
    externalEventId: v.optional(v.string()),
    tiers: v.array(v.object({ name: v.string(), price: v.number(), capacity: v.number(), sold: v.number() })),
    voucherCodes: v.optional(v.array(v.object({ code: v.string(), discount: v.number(), usedCount: v.number(), maxUses: v.optional(v.number()) }))),
  })),

  sponsorship: v.optional(v.object({         // MainShow only
    activations: v.array(v.object({
      brandName: v.string(),
      contact: v.optional(v.string()),
      stage: v.string(),                     // "pitched", "interested", "confirmed", "paid"
      basePackage: v.number(),
      variableCosts: v.optional(v.string()),
    })),
    cutoffDate: v.optional(v.number()),
  })),

  afterParty: v.optional(v.object({          // MainShow only
    venue: v.optional(v.string()),
    djLineup: v.array(v.string()),
    host: v.optional(v.string()),
    sections: v.array(v.object({ name: v.string(), durationMins: v.number(), genre: v.string() })),
  })),

  showRun: v.optional(v.array(v.object({     // MainShow, PopUp, Festival
    order: v.number(),
    name: v.string(),                        // "Intro", "Vibezzy", "Slow Jams break"
    durationMins: v.number(),
    setlistRef: v.optional(v.id("setlistItems")),
    notes: v.optional(v.string()),
    cues: v.optional(v.array(v.string())),   // "lighting: warm wash", "smoke at 0:30"
  }))),

  production: v.optional(v.object({          // MainShow, larger Festival
    crew: v.array(v.object({ name: v.string(), role: v.string(), contact: v.optional(v.string()) })),
    suppliers: v.array(v.object({ name: v.string(), service: v.string(), cost: v.optional(v.number()) })),
    loadIn: v.optional(v.number()),
    loadOut: v.optional(v.number()),
    riderUrl: v.optional(v.string()),
    decorTeam: v.optional(v.string()),
  })),

  marketingPlan: v.optional(v.object({       // MainShow, PopUp
    weeks: v.array(v.object({
      weekIndex: v.number(),
      theme: v.string(),
      posts: v.array(v.object({ platform: v.string(), copy: v.string(), scheduledAt: v.optional(v.number()), sent: v.boolean() })),
    })),
    eventbriteUrl: v.optional(v.string()),
  })),

  // Meeting/Rehearsal sub-block (named "meetingDetails" to avoid confusion with the standalone Notes module landing in Phase 4)
  meetingDetails: v.optional(v.object({
    transcript: v.optional(v.string()),
    decisions: v.array(v.string()),
    actions: v.array(v.object({ description: v.string(), assignee: v.optional(v.id("users")), taskId: v.optional(v.id("tasks")) })),
  })),
})
  .index("by_type_and_date", ["type", "startDate"])
  .index("by_status", ["status"])
  .index("by_lead_owner", ["leadOwner"])
```

### 4.3 Status state machines per type-family

| Family | States |
|---|---|
| **Client booking** (Wedding/Corporate/Festival/Private/Other) | Inquiry → InitialReview → BookingFormSent → FormReturned → DiscoveryCall → Quoting → ContractSent → ContractSigned → AwaitingDeposit → Booked → PreEvent → EventDay → AwaitingBalance → Completed (+ Cancelled, Lost) |
| **MainShow / PopUp / ContentShoot** | Planning → InProduction → Confirmed → ReadyForShow → Live → Completed (+ Cancelled, Postponed) |
| **Meeting / Rehearsal / Social** | Scheduled → InProgress → Completed (+ Cancelled) |

### 4.4 Tab matrix (engagement detail page)

Spine tabs (every engagement): **Overview · Tasks · Notes · Discussion · Assets**

Type-specific tabs only render when applicable:

| Tab | Wedding | Corp | Festival | Private | MainShow | PopUp | ContentShoot | Meeting | Rehearsal |
|---|---|---|---|---|---|---|---|---|---|
| Client info | ✓ | ✓ | ✓ | ✓ | – | – | – | – | – |
| Finance & Legal | ✓ | ✓ | ✓ | ✓ | – | – | – | – | – |
| Setlist | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | ✓ |
| Show Run | – | – | light | – | ✓ | light | – | – | – |
| Production | – | – | light | – | ✓ | – | light | – | – |
| Ticketing & Sales | – | – | – | – | ✓ | light | – | – | – |
| After Party | – | – | – | – | ✓ | – | – | – | – |
| Marketing | – | – | – | – | ✓ | light | – | – | – |
| Venue Partner | – | – | – | – | – | ✓ | – | – | – |
| Attendees | – | – | – | – | – | – | ✓ | ✓ | ✓ |
| Transcript | – | – | – | – | – | – | – | ✓ | light |
| Decisions & Actions | – | – | – | – | – | – | – | ✓ | ✓ |

### 4.5 Notion mapping (what goes where)

| Notion entity | Becomes | Notes |
|---|---|---|
| LME - BOOKINGS | `engagements` (Wedding/Corporate/Festival/Private/Other) | Pipeline kanban view filters by these types |
| LME - PROJECTS | `engagements` (MainShow/PopUp/ContentShoot) | "Categories" become engagement types |
| LME - CALENDAR | `engagements` rendered in Calendar view + extra non-engagement events | Calendar is a *view*, not a separate table |
| LME - TASKS | `tasks` (its own table) | Phase 4 |
| LME - Message Hub | `discussions` (its own table) | Phase 4 |

## 5. Booking lifecycle (Phase 1b)

The "fully manage the booking process inside the platform" goal. End-to-end:

### 5.1 Pipeline stages

```
Inquiry → Initial Review → Booking Form Sent → Form Returned →
Discovery Call → Quoting → Contract Sent → Contract Signed →
Awaiting Deposit → Booked → Pre-Event → Event Day →
Awaiting Balance → Completed
                    (+ Cancelled, Lost)
```

### 5.2 Stage details

1. **Inquiry** — public form on lmeband.com, **lightweight** (anti-spam: name, email, event type, date, venue, description). Writes to `engagements` with status=Inquiry. Auto-confirmation email to inquirer.

2. **Initial Review** — Chris/Tanisha review the inquiry. Decide go/no-go. If go, send full booking form to client.

3. **Booking Form Sent** — branded email with magic link to `/c/<slug>/<token>/booking-form`. Captures: band config (2/4/5-piece/custom), DJ extras, equipment source (LME bring / venue provides / mixed), specific extras (staging, production, etc.), expected guests, full event timing.

4. **Form Returned** — client submits. Engagement enriched with `bookingConfig`. Trigger task for team: schedule discovery call.

5. **Discovery Call** — slot picker on portal (or a calendly-style booking embed). Confirm details. Surface constraints. Decide what we can offer.

6. **Quoting** — Khari sets the fee. Quote PDF (or styled HTML email) generated and sent to portal. Status visible to client: "Quote ready — review".

7. **Contract Sent** — auto-generated from a contract template using engagement data (client, venue, date, fee, deposit, band config, extras). Stored as a versioned document on the engagement. Client sees "Contract ready — sign" in portal.

8. **Contract Signed** — in-platform e-sign: client types name + clicks Agree. Audit log records timestamp + IP. Convex stores `signedAt`, `signedByName`. **UK law:** simple e-signature is legally binding for private contracts; we collect intent + identity + timestamp which is sufficient evidence.

9. **Awaiting Deposit** — Xero invoice raised via API on contract sign. Engagement stores `xeroDepositInvoiceRef`. Client sees invoice + Pay button (deep links to Xero).

10. **Booked** — Xero webhook fires when deposit paid → engagement status=Booked.

11. **Pre-Event** — setlist locked, run-of-show drafted, pre-event survey form sent to client (genres, must-plays, do-not-plays, final timings). Outstanding-info tasks created automatically based on missing fields.

12. **Event Day** — mobile-friendly setlist + run view for the band. Client gets a pre-event message with arrival info + day-of contact.

13. **Awaiting Balance** — auto reminder schedule (cron): 14d / 7d / 1d before due date. Branded LME email. Balance invoice raised in Xero.

14. **Completed** — post-event survey email, photo/video gallery delivery (manual link to Dropbox or upload). Optional review-prompt link.

### 5.3 Client portal (`/c/:slug/:token`)

Magic-linked, mobile-first, LME-branded. Read-only by default; write actions are: pay button (Xero), sign button (e-sign), pre-event form submit.

**Visibility rule:** **only confirmed/sent items appear**. Drafts are invisible. The team explicitly sends each artefact to the client (contract, invoice, setlist, note).

**Lifespan:** active during the booking + **6 months post-event**, then auto-closes. Magic-link tokens are rotatable; revocation via admin action.

**Sections shown:**
- Greeting + booking summary (date, venue, type)
- Your contract (with sign button if unsigned)
- Your invoices (deposit + balance, with Pay buttons)
- The setlist we agreed
- Outstanding from us (pre-event form when relevant)
- Notes shared with you (engagement notes flagged "share with client")

## 6. Calendar model

**One unified calendar inside the app.** Single source of truth covering every engagement type. Filterable.

- **Filter chips:** All · My Events · Bookings · Main Shows · Pop-Ups · Rehearsals · Meetings · Socials
- **Per-user default filter** stored in user prefs (e.g. Reuben → "My Events ∪ Rehearsals", Tanisha → "Bookings", Khari → "All")
- **"Things requiring my attention"** filter — engagements where the user is in `attendees` AND status is in an upcoming-action state
- **Calendar = time-bound events only.** Tasks/deadlines do NOT appear on the calendar (they have their own due-date views in Tasks). Strong separation.

### 6.1 Personal iCal export

Each user has a per-user `.ics` feed at e.g. `app.lmeband.com/api/ical/<user>/<token>`. **The feed only contains engagements where the user is listed in `attendees`** — i.e. only what they're actually scheduled to attend. A meeting Reuben isn't invited to never appears in his iCal.

Subscribe-by-URL pattern compatible with iCloud, Google Calendar, Outlook. Token rotatable.

### 6.2 Per-engagement calendar (rolled up to master)

Each engagement (especially Main Shows) exposes a "this engagement's calendar" view in its detail page — showing the engagement itself plus all child engagements (where `parentEngagementId` points to it: rehearsals booked for the Summer Show, content shoots produced for it, the After Party as a child engagement, etc.). The master calendar is the union of all engagements. Useful for Stacey scoping Summer Show only.

## 7. Marketing model

**Per-engagement plans + central aggregator.** Both views matter:

- **Per-engagement Marketing tab** — the plan for that specific engagement (18-week phased plan for Summer Show, Eventbrite copy, social schedule, sponsor pitch links). Owner-edited.
- **Central Marketing module** — drills into individual plans AND aggregates. Cross-engagement timeline showing all marketing activity. Catches the "individually fine, cumulatively too much" trap the user described.

Central module structure:
- **Compose** (built) — rich-text + HTML, AI Draft assistant, preview modal, send test, send campaign
- **Campaigns** (built) — sortable list, filter chips, click-into detail with metrics
- **Contacts** (built) — sortable + searchable + status-filter table
- **Calendar** (new in Phase 2) — aggregated view of all scheduled marketing across all engagements + standalone campaigns
- **Aggregator** (new in Phase 3) — by-engagement rollup with drill-in

### 7.1 Marketing v2 capabilities (Phase 2)

- Schedule for later (campaigns queued, not just sent now)
- Welcome series for /enhancers signups (auto multi-step drip)
- Hard-bounce + complaint auto-suppression (auto-flip contact status)
- Auto-resend to non-openers (configurable cadence)
- Pre-send checklist (links work, merge tags valid, unsubscribe in footer, suppression list current)
- Draft approval workflow (Chris drafts → Khari reviews + approves)
- Per-engagement Marketing tab (data stored even if not yet centrally rendered)

## 8. Information architecture

### 8.1 Primary navigation (sidebar, app.lmeband.com)

```
LME logo
─────────
Dashboard
─────────
GIGS & EVENTS
Engagements      (with internal sub-tabs: Pipeline / Calendar / Projects / All)
Tasks
Calendar
─────────
COMMERCIAL
Marketing        (Compose / Campaigns / Contacts / Calendar / Aggregator)
Finance          (Cashflow / Invoices / Expenses)
─────────
CONTENT & MUSIC
Music            (Setlists / Programmes / Demos / Songs)
Library          (Photos / Brand / Contracts / Moodboards)
Enhancers        (Posts / Mixes / Members)
─────────
COMMUNICATION
Notes
Discussions
─────────
ADMIN
Team
Settings
```

Sidebar collapses on mobile. Section headers (GIGS & EVENTS, COMMERCIAL, etc.) are uppercase Space Mono labels.

### 8.2 Role-aware Dashboard

Default Dashboard layout per role (auto-populated, no `/linked view` friction like Notion):

- **Khari** — Bookings pipeline · Cashflow summary · Open tasks across team · Upcoming events (7-day)
- **Chris** — Active campaigns · Marketing calendar · Open marketing tasks · Active main shows
- **Reuben** — My calendar (next 14 days) · Active setlists · Open music tasks
- **Justin** — Open merch tasks · Active main shows (merch tab focus) · Sponsorship pipeline
- **Tanisha** — Bookings pipeline · My tasks · Today's events · Pending invoices
- **Stacey** — My active projects · Project progress · Open tasks for my projects · Marketing for my projects

Each role's dashboard is a template; users can override panels. Dashboard panels read from existing module queries.

## 9. Visual design direction

### 9.1 Theme

- **Light + dark mode**, user-toggleable, defaults to system preference (`prefers-color-scheme`)
- Theme stored in user prefs + cookie for SSR consistency
- All components built with both palettes; no manual override per page

### 9.2 Brand colours carry from public site

Reuses the LME palette with light-mode variants. Teal Primary (#14B8A6) is the universal accent.

| Token | Light mode | Dark mode |
|---|---|---|
| `bg-base` | #FAFAF7 | #080808 |
| `bg-surface` | #FFFFFF | #111111 |
| `bg-card` | #F5F5F0 | #1A1A1A |
| `border` | #E5E5E0 | #252525 |
| `text-primary` | #0A0A0A | #F5F5F0 |
| `text-body` | #333333 | #C4C4C4 |
| `text-muted` | #777777 | #8A8A8A |
| `accent` | #0D9488 (Teal Deep — readable on light bg) | #14B8A6 (Teal Primary) |
| `accent-hover` | #14B8A6 | #5EEAD4 |
| `success` | #1e6a3c | #5EEAD4 |
| `danger` | #aa3333 | #ff6b6b |

### 9.3 Typography

- **Bebas Neue** — reserved for hero moments only: dashboard headline, login screen, marketing detail pages. NOT for body, labels, table headers.
- **Inter** (or system-ui fallback) — primary working tool typeface. All body, tables, forms, navigation. 14px default, 13px in dense tables.
- **Space Mono** — section labels, metadata, timestamps, IDs (kept consistent with public site)

This shifts the editorial public-site feel into a legible, dense working tool while still feeling unmistakably LME.

### 9.4 Density

- Tables: dense (32px row height) by default, comfortable (44px) toggle
- Forms: 36px inputs
- Buttons: 32px small, 40px medium, 48px primary CTA
- Whitespace: less than the public site (no 120px section padding) — the CRM is a working tool

## 10. Phasing

Six sub-phases over ~6-8 months, sequenced to ship the bookings lifecycle and marketing v2 first per user priority.

### Phase 1a — Bookings MVP (~4-6 weeks)

**Ships:**
- Subdomain split (`app.lmeband.com`)
- Engagement table foundation (full schema, only Booking types in UI)
- Pipeline kanban (replaces Notion BOOKINGS view)
- Engagement detail page (Booking types only): Overview · Client · Finance & Legal (read-only display of any Xero refs already in Notion) · Setlist · Notes · Discussion · Tasks — all basic, in-page versions. **The full top-level Tasks/Notes/Discussions modules with cross-cutting views (My Tasks, By Person, Aggregator) land in Phase 4.** Phase 1a only ships these as engagement-scoped tabs, so each booking's tasks/notes/discussion live alongside the booking itself.
- Public inquiry form revised → writes to Convex (not Notion)
- Auto-confirmation email
- Migrate existing 269 bookings (Bria, Janice, etc.) from Notion → Convex
- Calendar view (filtered, basic version)
- Light + dark mode tokens + theme toggle

**Outcome:** Tanisha + Khari run the full bookings pipeline in `app.lmeband.com`. Notion BOOKINGS DB retired.

### Phase 1b — Booking Lifecycle (~6-8 weeks)

**Ships:**
- Two-stage capture: inquiry → review → full booking form sent to client
- Booking form captures: band config, extras, equipment, staging, full event details
- Discovery call booking (slot picker)
- Quoting flow → quote sent to portal
- Contract templates + auto-generation from engagement data
- E-sign in-platform (built, not DocuSign)
- Xero integration: push invoices, webhook updates engagement status
- Auto reminders (deposit pending / balance due 14d-7d-1d)
- Client portal (magic-linked, `/c/<slug>/<token>`) — confirmed-only items, 6mo lifespan
- Pre-event survey form
- Audit log on every client action

**Outcome:** Whole booking process — inquiry to final payment — runs from the platform. Bria-style admin pain ends.

### Phase 2 — Marketing v2 (~3-4 weeks)

**Ships:**
- Schedule for later
- Welcome series for /enhancers signups
- Hard-bounce + complaint auto-suppression
- Auto-resend to non-openers
- Pre-send checklist
- Draft approval workflow (Chris drafts → Khari approves)
- Per-engagement Marketing tab (plan stored against engagement; central rendering follows in Phase 3)

**Outcome:** Email program robust enough to retire MailChimp regrets. Each engagement carries a marketing plan.

### Phase 3 — Internal Events (~4-6 weeks)

**Ships:**
- Main Show + Pop-Up + Content Shoot engagement types active in UI
- Show Run tab · Production tab · After Party tab
- Eventbrite/Skiddle ticketing sync (read-side: pull sales into engagement)
- Sponsorship pipeline within Main Show
- Voucher code tracking
- Marketing aggregator — central view rolling up engagement plans
- Per-engagement calendar view

**Outcome:** Stacey moves Summer Show planning here. Ticket sales, sponsorship, marketing all visible per-show and across-shows.

### Phase 4 — Daily Internal Tools (~4-6 weeks)

**Ships:**
- Tasks module (replaces Notion TASKS): My Tasks / By Person / This Week / Overdue / Board
- Meeting Notes module (Sunday Catchup pattern): agenda, transcript upload, auto-extract decisions + actions → tasks
- Discussions / threads — per-engagement + aggregator view (replaces Message Hub)
- Role-aware Dashboard refinements
- Personal iCal export (per-user, attendees-only)

**Outcome:** Notion fully retired. Whole team operates from the platform.

### Phase 5 — Music + Library + Polish (~3-4 weeks)

**Ships:**
- Music Library: setlists as data, songs catalog, key/BPM/lead, demo links
- Asset Library: photos, brand kit, contracts, moodboards
- Enhancers admin CMS (full)
- Analytics: revenue by quarter, gigs by genre, fan growth
- Public CMS for editing setlist / homepage copy without code deploys

**Outcome:** Full platform vision live.

## 11. MVP definition (Phase 1a)

The Phase 1a deliverable is the **MVP**: the smallest cohesive thing that ships value beyond the current state. Specifically:

✓ Subdomain `app.lmeband.com` resolves to the CRM
✓ Public booking inquiry form writes to Convex
✓ Bookings pipeline kanban shows all engagements grouped by status
✓ Engagement detail page for a single booking shows all relevant tabs (basic content)
✓ Tanisha and Khari can manage bookings entirely from the new app
✓ Existing 269 bookings have been migrated; nothing lost

✗ NOT in MVP: contracts, e-sign, Xero, client portal, internal events, full marketing v2, Tasks/Notes/Discussions modules

The MVP is intentionally narrow. Phase 1b extends it into the full lifecycle 1-2 months later.

## 12. Out of scope / deferred

- **Merch / commercial pipeline** — Justin's needs aren't yet specified. Deferred to a future phase when the merch workflow is concrete.
- **Public CMS** — editing public marketing pages without code. Phase 5 only.
- **Production-grade Clerk keys** — current dev keys work; live keys deferred until needed.
- **Skiddle full migration** — Eventbrite is the chosen platform going forward; Skiddle reads only during migration window.
- **Multi-tenant or external partner access** — single-org platform.
- **Mobile native apps** — mobile-first web is sufficient.
- **AI Draft via API** — Khari rejected separate API billing; clipboard-prompt flow stays.

## 13. Open items for resolution

1. **Final domain choice** — `app.lmeband.com` (working assumption) vs `lmeband.app` vs `lme.band`/`app.lme.band`. Decision needed before Phase 1a deploy.
2. **Discovery call booking mechanism** — built-in slot picker (more work, more control) vs Calendly embed (faster, less custom) vs Cal.com self-hosted. Decision needed in Phase 1b kickoff.
3. **Contract template format** — HTML rendered to PDF (we control), DOCX merge (familiar to Khari), or block-based editor (cleanest but slowest to build). Decision in Phase 1b.
4. **Production Clerk keys + clerk.lmeband.com** — defer until launch polish; not blocking MVP.

## 14. Architectural choices not to relitigate

- Convex as the canonical data layer
- Clerk for admin auth (no organisations — flat allowlist + Clerk Invitations API + Convex `users` mirror)
- Magic-link HMAC cookies for fan + client portal access (NOT Clerk)
- Resend for outbound email
- Xero for accounting (CRM stores refs, doesn't replace)
- Eventbrite for ticketing (CRM syncs)
- Dropbox stays as raw file home; CDN-copied to Vercel Blob on use
- WhatsApp stays for chat banter
- Single Next.js repo, two hostnames

---

## Appendix A — Affected files / new files (sketch)

Phase 1a only:

```
src/
  proxy.ts                                    [edit] hostname routing for app.lmeband.com
  app/
    (app-domain)/                             [new] route group for app subdomain
      layout.tsx                              [new] CRM shell (sidebar, header, theme)
      dashboard/page.tsx                      [new] role-aware dashboard
      engagements/
        page.tsx                              [new] pipeline kanban
        [id]/page.tsx                         [new] engagement detail with tabs
        [id]/layout.tsx                       [new] tabs nav
        new/page.tsx                          [new] manual create
      calendar/page.tsx                       [new] calendar view
    (public-domain)/                          [refactor] move existing public pages here
      page.tsx                                [moved] homepage
      bookingform/page.tsx                    [edit] writes to Convex now
      ...
  components/
    crm/                                      [new] CRM-specific components
      Sidebar.tsx
      Pipeline.tsx
      EngagementDetail.tsx
      ThemeToggle.tsx
    ui/                                       [new] shared design-system primitives
      Button.tsx, Card.tsx, Table.tsx, Input.tsx
  lib/
    theme.ts                                  [new] light/dark token map

convex/
  schema.ts                                   [edit] add engagements table
  engagements.ts                              [new] queries + mutations
  bookingMigration.ts                         [new] one-shot Notion → Convex migrate
  publicInquiry.ts                            [new] public form → engagement
```

## Appendix B — Risks

- **Notion in parallel through Phases 1-3** is the biggest operational risk. Some team members may keep using Notion for muscle-memory reasons. Mitigation: Phase 4 lands Tasks/Notes/Discussions and forces full retirement; until then, document the "what goes where" rule clearly.
- **Bria-style booking pain continues** through the ~10-14 weeks of Phase 1a + 1b. Mitigation: Phase 1a still gives a better pipeline view; Phase 1b's lifecycle automation is the first true relief.
- **Xero API quirks** — rate limits, invoice number generation, contact sync. Mitigation: build the Xero integration with retries + idempotency in Phase 1b; budget extra time.
- **Subdomain migration mid-flight** if domain choice changes from `app.lmeband.com` to something else. Mitigation: keep domain as a config var; routing is hostname-based, not path-based.

## Appendix C — Success criteria (per phase)

| Phase | Quantitative | Qualitative |
|---|---|---|
| 1a | 100% bookings in Convex; Notion BOOKINGS read-only | Tanisha says "I prefer the new pipeline" |
| 1b | First wedding fully signed + invoiced through CRM | Khari says "I haven't touched email-PDF-attachment loop in 2 weeks" |
| 2 | First welcome series sent automatically; first scheduled campaign | Chris says "I forgot what MailChimp was like" |
| 3 | Summer Show fully managed in CRM (incl. tickets sync) | Stacey says "I never open Notion for Summer Show" |
| 4 | All 5 Notion DBs read-only or archived | Whole team has a single tab open: app.lmeband.com |
| 5 | Public CMS edits ship without a deploy | Khari does brand work without touching code |

---

*End of spec. Review and request changes before implementation planning begins.*
