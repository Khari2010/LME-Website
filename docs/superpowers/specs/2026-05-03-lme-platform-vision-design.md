# LME Platform Vision — Design Spec

**Date:** 2026-05-03
**Status:** Draft for review (v2 — incorporates Khari's review feedback)
**Author:** Khari + Claude
**Related plans:** TBD (will be created from this spec, phase by phase)

---

## 1. Vision

LME currently runs on a stack of: a public Next.js site (`lmeband.com`), an admin sub-app at `/admin/*`, Convex for new data, Notion for everything else, MailChimp (now retired) for email, Dropbox for files, Xero for invoicing, Skiddle and Eventbrite for ticketing, and WhatsApp for chat. The new platform unifies the operational layer of this — events, marketing, finance, music — into a single internal CRM at **`app.lmeband.com`**, while keeping the public marketing site at **`lmeband.com`**. Notion retires across phases. Xero, Eventbrite, Dropbox, and WhatsApp stay as canonical sources for what they do best; the CRM integrates with them rather than replacing them.

The platform is built for the band's directors plus collaborators with distinct daily workflows, and exposes a magic-linked client portal for clients with active bookings.

## 2. Architecture decision: one repo, two domains

Single Next.js codebase, two public surfaces:

- **`lmeband.com`** — public marketing site, fan area (`/enhancers`), booking inquiry form, mailing-list capture, setlist, unsubscribe
- **`app.lmeband.com`** — internal CRM (the work described in this spec)
- **`app.lmeband.com/c/:slug/:token`** — magic-linked client portal (per booking, scoped read-only access)

Hostname routing in `src/proxy.ts` resolves which surface renders. Convex schema, Clerk auth, brand assets, types, and components are shared. Splitting later into 2 repos remains an option if the CRM ever needs its own dev cadence.

**Domain note:** Both surfaces share the existing `lmeband.com` registration — `app.lmeband.com` is just a DNS subdomain (free, ~30 mins to configure). Considered alternatives (`lme.band`, `lmeband.app`) deferred to keep cost/complexity at zero.

## 3. Module map (top-level navigation)

The CRM has **6 top-level modules**. Tasks, Notes, and Discussions are intentionally NOT modules — Tasks is deferred (the team isn't using tasks accurately today), and Notes/Discussions exist as inline textareas inside event detail pages, not as their own pages.

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | **Dashboard** | Built (basic) | Role-aware home |
| 2 | **Events** | New | The unified Events model — sub-pages for External Bookings, Internal Shows, Team Diary |
| 3 | **Marketing** | Partial — Email built; needs Content Planner + Social | Sub-pages: Email · Content Planner · Social Dashboard · (future) Direct Posting |
| 4 | **Music** | New | Sub-pages: Setlists · Songs · Demos. Absorbs the music-asset library |
| 5 | **Finance** | New (Xero-backed) | Cashflow · Invoices · Expenses · Contracts |
| 6 | **Enhancers** | Built (partial) | Posts · Mixes · Members |
| 7 | **Settings** | New (absorbs Team) | Team · Profile · Integrations · Branding |

(Counted as 7 because Settings is administrative — sometimes shown collapsed at the bottom of the sidebar.)

**Removed from earlier draft:** standalone Tasks, Notes, Discussions, Library (now contextual to each module), Calendar (rolls into Events).

**Analytics** is woven across modules (not a separate page): cashflow trend in Finance, campaign performance in Marketing, sales funnel in External Bookings, ticket sales velocity on Internal Shows, fan-growth on Enhancers, etc.

## 4. The unified Events model

This is the foundational data decision. Notion's BOOKINGS + PROJECTS + CALENDAR collapse into **one `events` table** with a type discriminator and optional sub-blocks rendered conditionally in the UI.

(Internally I sometimes call this entity an "engagement" because the data spans booking-as-deal, show-as-project, and meeting-as-calendar-entry. The UI label is **Event**.)

### 4.1 Event types and families

Three families, each with its own sub-page in the Events module:

#### External Bookings (paid client gigs)
| Type | Notes |
|---|---|
| `Wedding` | The Bria + Kris pattern |
| `Corporate` | Brand launch, conference |
| `Festival` | Festival slot |
| `PrivateParty` | Birthday, anniversary, private function |
| `Other` | Anything else paid |

#### Internal Shows (LME-organised public events)
| Type | Notes |
|---|---|
| `MainShow` | Summer Show, EOY Show — flagship multi-month projects |
| `PopUp` | Mamas Saturday Night, venue collabs |

#### Team Diary (operational, non-public)
| Type | Notes |
|---|---|
| `ContentShoot` | Photoshoot, music video, EPK |
| `Meeting` | Sunday Catchup, sync, planning meeting |
| `Rehearsal` | Programmed practice |
| `Social` | Team dinner, retreat, away day |

### 4.2 Schema sketch (Convex)

```ts
events: defineTable({
  // ===== Spine — every event =====
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
  ), // derived from type but stored for fast filtering
  status: v.string(), // type-specific lifecycle (see 4.3)
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
  attendees: v.optional(v.array(v.id("users"))), // who is "scheduled" — drives personal iCal export
  description: v.optional(v.string()),
  notes: v.optional(v.string()), // free-form Notes textarea on Overview tab
  parentEventId: v.optional(v.id("events")), // sub-events: rehearsal → MainShow, content shoot → MainShow campaign
  coverImage: v.optional(v.string()),
  nextActionLabel: v.optional(v.string()), // e.g. "Send contract" — surfaced on dashboards as the "what's next" cue (replaces tasks)
  nextActionDue: v.optional(v.number()),

  // ===== Optional sub-blocks — render conditionally per type =====
  client: v.optional(v.object({              // External Bookings only
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
  })),

  bookingConfig: v.optional(v.object({       // External Bookings (Phase 1b form capture)
    bandConfig: v.string(),                   // "5-piece", "4-piece", custom
    djRequired: v.boolean(),
    equipmentSource: v.union(v.literal("LME"), v.literal("Venue"), v.literal("Mixed")),
    extras: v.array(v.string()),              // staging, production, etc.
    expectedGuests: v.optional(v.number()),
  })),

  finance: v.optional(v.object({             // External Bookings
    fee: v.optional(v.number()),
    deposit: v.optional(v.object({ amount: v.number(), paid: v.boolean(), paidAt: v.optional(v.number()) })),
    balance: v.optional(v.object({ amount: v.number(), dueDate: v.number(), paid: v.boolean(), paidAt: v.optional(v.number()) })),
    xeroDepositInvoiceRef: v.optional(v.string()),
    xeroBalanceInvoiceRef: v.optional(v.string()),
  })),

  contract: v.optional(v.object({            // External Bookings
    templateId: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    signedAt: v.optional(v.number()),
    signedByName: v.optional(v.string()),
    auditLog: v.array(v.object({ ts: v.number(), action: v.string(), ip: v.optional(v.string()) })),
  })),

  ticketing: v.optional(v.object({           // Internal Shows
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
    setlistRef: v.optional(v.id("setlists")),
    notes: v.optional(v.string()),
    cues: v.optional(v.array(v.string())),   // "lighting: warm wash", "smoke at 0:30"
  }))),

  production: v.optional(v.object({          // MainShow, larger Festival
    crew: v.array(v.object({ name: v.string(), role: v.string(), contact: v.optional(v.string()) })),
    suppliers: v.array(v.object({ name: v.string(), service: v.string(), cost: v.optional(v.number()) })),
    loadIn: v.optional(v.number()),
    loadOut: v.optional(v.number()),
    riderUrl: v.optional(v.string()),
    decorTeam: v.optional(v.string()),       // e.g. "Camara's décor team — 4-5 people"
  })),

  marketingPlan: v.optional(v.object({       // Internal Shows
    weeks: v.array(v.object({
      weekIndex: v.number(),
      theme: v.string(),
      posts: v.array(v.object({ platform: v.string(), copy: v.string(), scheduledAt: v.optional(v.number()), sent: v.boolean() })),
    })),
    eventbriteUrl: v.optional(v.string()),
  })),

  meetingDetails: v.optional(v.object({      // Meeting/Rehearsal
    transcript: v.optional(v.string()),
    decisions: v.array(v.string()),
    actions: v.array(v.object({ description: v.string(), assignee: v.optional(v.id("users")), done: v.boolean() })),
    // Note: actions are not a separate Tasks table. They live on the meeting and surface on the assignee's dashboard.
  })),
})
  .index("by_family_and_date", ["family", "startDate"])
  .index("by_type_and_date", ["type", "startDate"])
  .index("by_status", ["status"])
  .index("by_lead_owner", ["leadOwner"])
```

### 4.3 Status state machines per family

| Family | States |
|---|---|
| **External Booking** | Inquiry → InitialReview → BookingFormSent → FormReturned → DiscoveryCall → Quoting → ContractSent → ContractSigned → AwaitingDeposit → Booked → PreEvent → EventDay → AwaitingBalance → Completed (+ Cancelled, Lost) |
| **Internal Show** | Planning → InProduction → Confirmed → ReadyForShow → Live → Completed (+ Cancelled, Postponed) |
| **Team Diary** | Scheduled → InProgress → Completed (+ Cancelled) |

### 4.4 Tab matrix (event detail page)

Spine tabs (every event): **Overview · Setlist · Assets** (where Notes is an inline textarea on Overview, not a separate tab).

Type-specific tabs render only when applicable:

| Tab | Wedding | Corp | Festival | Private | MainShow | PopUp | ContentShoot | Meeting | Rehearsal | Social |
|---|---|---|---|---|---|---|---|---|---|---|
| Client info | ✓ | ✓ | ✓ | ✓ | – | – | – | – | – | – |
| Finance & Legal | ✓ | ✓ | ✓ | ✓ | – | – | – | – | – | – |
| Setlist | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | – |
| Show Run | – | – | light | – | ✓ | light | – | – | – | – |
| Production | – | – | light | – | ✓ | – | light | – | – | – |
| Ticketing & Sales | – | – | – | – | ✓ | light | – | – | – | – |
| After Party | – | – | – | – | ✓ | – | – | – | – | – |
| Marketing | – | – | – | – | ✓ | light | – | – | – | – |
| Venue Partner | – | – | – | – | – | ✓ | – | – | – | – |
| Attendees | – | – | – | – | – | – | ✓ | ✓ | ✓ | ✓ |
| Transcript | – | – | – | – | – | – | – | ✓ | light | – |
| Decisions & Actions | – | – | – | – | – | – | – | ✓ | ✓ | – |

**No Tasks tab** — engagement status + the Decisions & Actions block on meetings cover the "what's next" cue.

**No Discussion tab** — WhatsApp stays for chat banter; durable decisions land in Notes (inline) or Meeting Decisions.

### 4.5 Notion mapping

| Notion entity | Becomes | Phase |
|---|---|---|
| LME - BOOKINGS | `events` (External Booking types) | 1a |
| LME - PROJECTS (Main Shows / Pop-Ups categories) | `events` (Internal Show types) | 3 |
| LME - PROJECTS (Content Making category) | `events` (ContentShoot type) | 3 |
| LME - CALENDAR | `events` rendered in Calendar view | 1a |
| LME - TASKS | Deferred — possibly Phase 6 if usage habits change | n/a |
| LME - Message Hub | Cut — replaced by inline Notes + WhatsApp | n/a |

## 5. Booking lifecycle (Phase 1b)

The "fully manage the booking process inside the platform" goal. End-to-end from public form to final payment.

### 5.1 Pipeline stages

```
Inquiry → Initial Review → Booking Form Sent → Form Returned →
Discovery Call → Quoting → Contract Sent → Contract Signed →
Awaiting Deposit → Booked → Pre-Event → Event Day →
Awaiting Balance → Completed
                    (+ Cancelled, Lost)
```

### 5.2 Stage details

1. **Inquiry** — public form on `lmeband.com`, **lightweight** (anti-spam: name, email, event type, date, venue, description). Writes to `events` with status=Inquiry. Auto-confirmation email to inquirer.

2. **Initial Review** — Chris/Tanisha review the inquiry. Decide go/no-go. If go, send full booking form to client.

3. **Booking Form Sent** — branded email with magic link to `/c/<slug>/<token>/booking-form`. Captures: band config (2/4/5-piece/custom), DJ extras, equipment source, specific extras (staging, production), expected guests, full event timing.

4. **Form Returned** — client submits. Event enriched with `bookingConfig`. `nextActionLabel` becomes "Schedule discovery call".

5. **Discovery Call** — slot picker on portal (or Calendly/Cal.com embed — see open items). Confirm details. Surface constraints. Decide what we can offer.

6. **Quoting** — Khari sets the fee. Quote sent to portal. Client sees "Quote ready — review".

7. **Contract Sent** — auto-generated from a contract template using event data. Stored as a versioned document on the event. Client sees "Contract ready — sign".

8. **Contract Signed** — in-platform e-sign: client types name + clicks Agree. Audit log records timestamp + IP. **UK law:** simple e-signature is legally binding for private contracts; intent + identity + timestamp is sufficient evidence.

9. **Awaiting Deposit** — Xero invoice raised via API on contract sign. Event stores `xeroDepositInvoiceRef`. Client sees invoice + Pay button.

10. **Booked** — Xero webhook fires when deposit paid → event status=Booked.

11. **Pre-Event** — setlist locked, run-of-show drafted, pre-event survey form sent to client. `nextActionLabel` cues for outstanding info.

12. **Event Day** — mobile-friendly setlist + run view for the band. Client gets pre-event message with arrival info.

13. **Awaiting Balance** — auto reminder schedule (cron): 14d / 7d / 1d before due date. Branded email. Balance invoice raised in Xero.

14. **Completed** — post-event survey email, photo/video gallery delivery (link to Dropbox or upload). Optional review-prompt link.

### 5.3 Client portal (`app.lmeband.com/c/:slug/:token`)

Magic-linked, mobile-first, LME-branded. Read-only by default; write actions are: pay button (Xero deep link), sign button (e-sign), pre-event form submit.

**Visibility rule:** **only confirmed/sent items appear**. Drafts are invisible. The team explicitly sends each artefact to the client (contract, invoice, setlist, note).

**Lifespan:** active during the booking + **6 months post-event**, then auto-closes. Magic-link tokens are rotatable; revocation via admin action.

**Sections shown:**
- Greeting + booking summary (date, venue, type)
- Your contract (with sign button if unsigned)
- Your invoices (deposit + balance, with Pay buttons)
- The setlist we agreed
- Outstanding from us (pre-event form when relevant)
- Notes shared with you (event notes flagged "share with client")

## 6. Calendar model

The Events module includes a Calendar view (toggle from kanban/list). **One unified calendar inside the app** showing every event type. Filterable.

- **Filter chips:** All · External Bookings · Internal Shows · Team Diary · My Events · Things requiring my attention
- **Per-user default filter** stored in user prefs (e.g. Reuben → "My Events ∪ Rehearsals", Tanisha → "External Bookings", Khari → "All")
- **Calendar = time-bound events only.** Tasks/deadlines do NOT appear (no Tasks module exists; status indicators on event cards convey "what needs attention").

### 6.1 Personal iCal export

Each user has a per-user `.ics` feed at `app.lmeband.com/api/ical/<user>/<token>`. **The feed only contains events where the user is listed in `attendees`** — what they're actually scheduled to attend. A meeting Reuben isn't invited to never appears in his iCal. Subscribe-by-URL pattern compatible with iCloud, Google Calendar, Outlook.

### 6.2 Per-event sub-calendar

Each event (especially Main Shows) exposes a "this event's calendar" view in its detail page — showing the event itself plus all child events (where `parentEventId` points to it: rehearsals booked for the Summer Show, content shoots produced for it, the After Party as a child event). Useful for Stacey scoping Summer Show only.

## 7. Marketing module

Sub-pages:

### 7.1 Email
The current Compose / Campaigns / Contacts surface. Phase 2 adds:
- Schedule for later (campaigns queued)
- Welcome series for /enhancers signups
- Hard-bounce + complaint auto-suppression
- Auto-resend to non-openers
- Pre-send checklist
- Draft approval workflow (Chris drafts → Khari approves)

### 7.2 Content Planner
A calendar view of all marketing activity across the platform — emails, social posts, Eventbrite copy releases, sponsor-pitch deadlines. Catches the "individually fine, cumulatively too much" problem the user described.

Drill-in from each entry: tap a Summer Show post → opens the Summer Show event detail's Marketing tab.

### 7.3 Social Dashboard
Read-side integrations with Instagram, TikTok, YouTube, Facebook to show:
- Current follower counts per platform
- Growth trend (7d / 30d / 90d)
- Last post performance
- Suggested posting cadence

Phase 5 work. APIs to integrate: Instagram Graph API (requires Business account), TikTok Display API, YouTube Data API.

### 7.4 Direct Posting (future, post-Phase 5)
Allow Chris/Tamara to compose and schedule a post that fans out to IG + TikTok + Twitter. Each platform requires its own API + content-policy compliance. Genuinely complex; deferred.

## 8. Information architecture

### 8.1 Primary navigation (sidebar, `app.lmeband.com`)

```
LME logo
Dashboard
─────────
Events
├ External Bookings
├ Internal Shows
└ Team Diary
─────────
Marketing
├ Email
├ Content Planner
├ Social Dashboard
└ (future) Direct Post
─────────
Music
├ Setlists
├ Songs
└ Demos
─────────
Finance
├ Cashflow
├ Invoices
├ Expenses
└ Contracts
─────────
Enhancers
├ Posts
├ Mixes
└ Members
─────────
Settings
├ Team
├ Profile
├ Integrations
└ Branding
```

Sidebar collapses on mobile to icon rail. Sub-pages expand inline when parent is active. Section dividers are visual only (no headers).

### 8.2 Role-aware Dashboard

Each user lands on a Dashboard tailored to their role. Auto-populated, no manual `/linked view` setup like Notion.

| Role | Default panels |
|---|---|
| **Director** (Khari, Chris, Reuben, Justin) | Cashflow summary · External bookings pipeline · Internal shows in production · Today's events · Marketing this week |
| **Tanisha** (Admin/Ticketing) | External bookings pipeline · Awaiting deposit / awaiting balance · Today's bookings · Outstanding info to chase |
| **Stacey** (Internal Events lead) | Internal shows in production · Project progress per show · Today's events · Marketing for my shows |
| **Tamara** (Marketing) | Marketing campaigns this week · Content Planner timeline · Recent campaign performance · Social growth |
| **Camara / Jabari** (Production) | Internal shows where I'm in production · Show Run + Production tabs prominent · Load-in/load-out countdown |
| **Jess** (Ticketing) | Internal shows ticketing summary · Sales velocity · Voucher redemptions · Eventbrite/Skiddle sync status |

Each role's dashboard is a template; users can override panels.

## 9. Roles & permissions

A real RBAC layer is needed because the team now has 10 people across 4 access tiers. Convex queries enforce permissions; UI hides nav items the user can't access.

### 9.1 Roles

```ts
role: v.union(
  v.literal("director"),       // full access — everything
  v.literal("admin"),          // Tanisha — external bookings, ticketing, finance read
  v.literal("internal-events"),// Stacey — internal shows, marketing read
  v.literal("marketing"),      // Tamara — marketing module + read events
  v.literal("production"),     // Camara, Jabari — production tabs on shows they're crew on
  v.literal("ticketing"),      // Jess — ticketing tabs + sales analytics
)
```

### 9.2 Permission matrix

| Module | director | admin | internal-events | marketing | production | ticketing |
|---|---|---|---|---|---|---|
| Dashboard | full | role-scoped | role-scoped | role-scoped | role-scoped | role-scoped |
| Events: External Bookings | full | full | read | read | hidden | hidden |
| Events: Internal Shows | full | read | full | read | crew-scoped | ticketing-scoped |
| Events: Team Diary | full | read | read | read | read | hidden |
| Marketing | full | hidden | read | full | hidden | hidden |
| Music | full | read | read | read | read | hidden |
| Finance | full | read | hidden | hidden | hidden | hidden |
| Enhancers | full | hidden | read | full | hidden | hidden |
| Settings | full | read (own profile) | read (own profile) | read (own profile) | read (own profile) | read (own profile) |

**"crew-scoped"** = Camara/Jabari only see Internal Shows where they're listed in `production.crew`.
**"ticketing-scoped"** = Jess sees the Ticketing tab on all Internal Shows but not other tabs.
**"role-scoped"** dashboard = panels filtered to what the role can see (e.g. Tamara's dashboard shows marketing-related panels).

### 9.3 Phase 1a implication

Phase 1a only needs **director** + **admin** roles wired (Khari, Chris, Reuben, Justin, Tanisha). Other roles arrive in Phase 5 when the team expands.

## 10. Visual design direction

### 10.1 Theme

- **Light + dark mode**, user-toggleable, defaults to system preference
- Theme stored in user prefs + cookie for SSR consistency
- All components built with both palettes; no manual override per page

### 10.2 Brand colours carry from public site

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

### 10.3 Typography

- **Bebas Neue** — reserved for hero moments only: dashboard headline, login screen
- **Inter** (or system-ui fallback) — primary working tool typeface. All body, tables, forms, navigation
- **Space Mono** — section labels, metadata, timestamps, IDs

### 10.4 Density

- Tables: 32px row height default, comfortable (44px) toggle
- Forms: 36px inputs
- Buttons: 32px small, 40px medium, 48px primary CTA
- Whitespace: less than the public site (no 120px section padding) — the CRM is a working tool

## 11. Phasing

Five active phases over ~5-7 months, plus a Phase 6 "Future" bucket. Sequenced to ship the bookings lifecycle and marketing v2 first.

### Phase 1a — Bookings MVP (~4-6 weeks)

**Ships:**
- Subdomain `app.lmeband.com` (DNS subdomain on existing `lmeband.com`)
- Events table foundation (full schema, only External Booking types in UI)
- Events › External Bookings sub-page (pipeline kanban) — replaces Notion BOOKINGS view
- Event detail page (External Booking type only): Overview · Client · Finance & Legal (read-only) · Setlist · Inline Notes (textarea on Overview)
- Public inquiry form revised → writes to Convex (not Notion)
- Auto-confirmation email
- Migrate existing 269 bookings (Bria, Janice, etc.) from Notion → Convex
- Calendar view (basic) within Events module
- Light + dark mode tokens + theme toggle
- Director + admin roles only

**Outcome:** Tanisha + Khari run the full bookings pipeline in `app.lmeband.com`. Notion BOOKINGS DB retired.

### Phase 1b — Booking Lifecycle (~6-8 weeks)

**Ships:**
- Two-stage capture: inquiry → review → full booking form sent to client
- Booking form captures: band config, extras, equipment, staging, full event details
- Discovery call booking
- Quoting flow → quote sent to portal
- Contract templates + auto-generation from event data
- E-sign in-platform
- Xero integration: push invoices, webhook updates event status
- Auto reminders (deposit / balance 14d-7d-1d)
- Client portal (magic-linked, `/c/<slug>/<token>`) — confirmed-only items, 6mo lifespan
- Pre-event survey form
- Audit log on every client action

**Outcome:** Whole booking process — inquiry to final payment — runs from the platform.

### Phase 2 — Marketing v2 (~3-4 weeks)

**Ships:**
- Schedule for later
- Welcome series for /enhancers signups
- Hard-bounce + complaint auto-suppression
- Auto-resend to non-openers
- Pre-send checklist
- Draft approval workflow (Chris drafts → Khari approves)
- **Content Planner** sub-page (cross-module marketing calendar)
- Per-event Marketing tab (data stored against the event, even if not centrally aggregated yet)

**Outcome:** Email program robust enough to retire MailChimp regrets. Cross-event marketing visible in one timeline.

### Phase 3 — Internal Shows (~4-6 weeks)

**Ships:**
- Events › Internal Shows sub-page
- Main Show + Pop-Up types active in UI
- Show Run tab · Production tab · After Party tab
- Eventbrite/Skiddle ticketing sync (read-side: pull sales into event)
- Sponsorship pipeline within Main Show
- Voucher code tracking
- `parentEventId` for sub-events (rehearsals as child of MainShow, etc.)

**Outcome:** Stacey moves Summer Show planning here. Ticket sales, sponsorship visible per-show.

### Phase 4 — Music + Team Diary (~3-4 weeks)

**Ships:**
- Music module: Setlists with key/BPM/lead/demo links (SoundCloud or YouTube)
- Songs catalog
- Demos library
- Events › Team Diary sub-page (Meeting/Rehearsal/Social with transcript + decisions + actions)
- Auto-extract decisions/actions from transcript on Meeting events

**Outcome:** Reuben's music library is a real thing. Sunday Catchup pattern formalised; decisions persist.

### Phase 5 — Roles, Finance polish, Analytics (~4-6 weeks)

**Ships:**
- Full RBAC: production, marketing, ticketing, internal-events roles wired
- Onboard Tamara, Camara, Jabari, Jess
- Finance module — Cashflow / Invoices / Expenses / Contracts overviews (Xero-backed)
- Marketing › Social Dashboard (read-only social-platform stats)
- Analytics widgets across modules: revenue by quarter, gigs by genre, fan growth, ticket sales velocity, campaign performance
- Enhancers admin CMS (full posts/mixes/members management)

**Outcome:** Whole expanded team operates from the platform. Khari has cashflow + analytics visibility.

### Phase 6 — Future (deferred)

Held until trigger conditions:
- **Direct Social Posting** (IG/TikTok/Twitter from CRM) — when social tools mature and team wants single-pane posting
- **Tasks module** — only if team usage habits change and tasks become valuable. Status indicators on events may be enough indefinitely
- **Public CMS** — editing public site copy without code deploys
- **Production-grade Clerk keys + clerk.lmeband.com** — when launch polish is the priority

## 12. MVP definition (Phase 1a)

The Phase 1a deliverable is the **MVP**: the smallest cohesive thing that ships value beyond the current state. Specifically:

✓ `app.lmeband.com` resolves to the CRM
✓ Public booking inquiry form writes to Convex
✓ External Bookings pipeline kanban shows all bookings grouped by status
✓ Event detail page for a single booking shows all relevant tabs (basic content)
✓ Tanisha and Khari manage bookings entirely from the new app
✓ Existing 269 bookings migrated; nothing lost
✓ Light + dark mode works

✗ NOT in MVP: contracts, e-sign, Xero, client portal, Internal Shows, full marketing v2, Music module, Finance module, RBAC beyond director/admin

The MVP is intentionally narrow. Phase 1b extends it into the full lifecycle 1-2 months later.

## 13. Out of scope

- **Merch / commercial pipeline** — Justin's needs aren't yet specified
- **Tasks module** — deferred to Phase 6 trigger
- **Notes / Discussions standalone modules** — cut; replaced by inline Notes on event Overview tab
- **Library as standalone module** — cut; contextual within each module
- **Public CMS** — Phase 6
- **Skiddle full migration** — Eventbrite is canonical; Skiddle reads only
- **Multi-tenant or external partner access** — single-org platform
- **Mobile native apps** — mobile-first web is sufficient
- **AI Draft via API** — clipboard-prompt flow stays

## 14. Open items for resolution

1. **Discovery call booking mechanism** — built-in slot picker (more work, more control) vs Calendly embed (faster) vs Cal.com self-hosted. Decision in Phase 1b kickoff
2. **Contract template format** — HTML→PDF, DOCX merge, or block-based editor. Decision in Phase 1b
3. **Social Dashboard scope** — IG/TikTok/YouTube/FB all? Or just IG + TikTok at first?

## 15. Architectural choices not to relitigate

- Convex as the canonical data layer
- Clerk for admin auth (no organisations — flat allowlist + Clerk Invitations API + Convex `users` mirror)
- Magic-link HMAC cookies for fan + client portal access (NOT Clerk)
- Resend for outbound email
- Xero for accounting (CRM stores refs, doesn't replace)
- Eventbrite for ticketing (CRM syncs)
- Dropbox stays as raw file home; CDN-copied to Vercel Blob on use
- WhatsApp stays for chat (Discussions module deliberately not built)
- Single Next.js repo, two hostnames

---

## Appendix A — Affected files for Phase 1a

```
src/
  proxy.ts                                    [edit] hostname routing for app.lmeband.com
  app/
    (app-domain)/                             [new] route group for app.lmeband.com
      layout.tsx                              [new] CRM shell (sidebar, header, theme) — gates by hostname
      dashboard/page.tsx                      [new] role-aware dashboard
      events/
        page.tsx                              [new] redirects to /events/external-bookings
        external-bookings/page.tsx            [new] pipeline kanban
        [id]/page.tsx                         [new] event detail with tabs
        [id]/layout.tsx                       [new] tabs nav
        new/page.tsx                          [new] manual create
        calendar/page.tsx                     [new] calendar view
    (public-domain)/                          [refactor] keep existing public pages here
      page.tsx                                [moved] homepage
      bookingform/page.tsx                    [edit] writes to Convex now
      ...
  components/
    crm/                                      [new] CRM-specific components
      Sidebar.tsx
      Pipeline.tsx
      EventDetail.tsx
      ThemeToggle.tsx
    ui/                                       [new] shared design-system primitives
      Button.tsx, Card.tsx, Table.tsx, Input.tsx
  lib/
    theme.ts                                  [new] light/dark token map

convex/
  schema.ts                                   [edit] add events table
  events.ts                                   [new] queries + mutations
  bookingMigration.ts                         [new] one-shot Notion → Convex migrate
  publicInquiry.ts                            [new] public form → event
```

## Appendix B — Risks

- **Notion in parallel through Phases 1-3** is the biggest operational risk. Mitigation: Phase 4 lands Team Diary; until then, document the "what goes where" rule
- **Bria-style booking pain continues** through ~10-14 weeks of Phase 1a + 1b. Mitigation: Phase 1a still gives a better pipeline view; Phase 1b lifecycle automation is the first true relief
- **Xero API quirks** — rate limits, invoice number generation, contact sync. Mitigation: build with retries + idempotency in Phase 1b
- **Domain migration** — if you ever later add `lme.band` or `lmeband.app`, routing is hostname-based, so adding another hostname is config, not code
- **Tasks deferral feedback loop** — if Phase 4 ships and the team feels the lack of tasks, we add it in Phase 6. Cheap to add later if data is structured well

## Appendix C — Success criteria per phase

| Phase | Quantitative | Qualitative |
|---|---|---|
| 1a | 100% bookings in Convex; Notion BOOKINGS read-only | Tanisha says "I prefer the new pipeline" |
| 1b | First wedding fully signed + invoiced through CRM | Khari says "I haven't touched email-PDF-attachment loop in 2 weeks" |
| 2 | First welcome series sent automatically; first scheduled campaign | Chris says "I forgot what MailChimp was like" |
| 3 | Summer Show fully managed in CRM (incl. tickets sync) | Stacey says "I never open Notion for Summer Show" |
| 4 | All 5 Notion DBs read-only or archived; Music module live | Reuben says "the setlist library is finally a real thing" |
| 5 | Tamara/Camara/Jabari/Jess actively using their scoped views | Whole team's only tab is `app.lmeband.com` |

---

*End of spec v2. Review and request changes before implementation planning begins.*
