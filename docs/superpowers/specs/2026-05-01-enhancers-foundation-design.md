# LME Platform — Sub-Project #1a: Enhancers Foundation Design Spec

## Overview

The LME website is expanding into a full operations platform. This spec covers **sub-project #1a — Enhancers Foundation** — the first vertical slice that establishes the foundational infrastructure (Convex + Clerk + magic-link auth) and ships the first user-visible feature (a private Enhancers community area for fans).

**Sub-project #1a scope:** Convex + Clerk setup, all canonical schemas defined, signup form, magic-link auth for fans, gated `/enhancers` page, post viewer, `/admin` shell with Clerk-gated dashboard. Out of scope: AI composer (#1b), email send pipeline (#1c), Notion data migrations (#2-#5).

This is the first module of a longer migration off Notion + MailChimp + Reuben's iCloud calendar onto a single owned platform. By the end of all sub-projects, LME's contacts, content, bookings, tasks, projects, calendar, and team discussions all live in Convex; emails compose via Claude and send via Resend; the website hosts both fan-facing (`/enhancers`) and team-facing (`/admin`) surfaces.

---

## The bigger picture (full module roadmap)

Seven sub-projects in sequence, ~14–16 weeks calendar end-to-end. Each ships independently; each gets its own design spec when its turn comes. This spec details only #1a.

| # | Title | Estimate | Output |
|---|---|---|---|
| **1a** | **Enhancers Foundation + admin shell** (this spec) | ~2.5 weeks | Convex+Clerk infra, all schemas defined, signup, magic-link gate, `/enhancers`, `/admin` shell with dashboard |
| **1b** | Asset Library + AI Composer | ~3 weeks | Photos/audio/video catalogues sourced from Dropbox, Convex file storage CDN, `/admin/compose` with Claude integration via per-user Anthropic keys |
| **1c** | Send Pipeline | ~1–2 weeks | React Email branded campaign template, Resend send, campaign archive populated, `/enhancers/posts/[slug]` rendered from sent campaigns. **MailChimp cancelled at end of this phase.** |
| **2** | Bookings migration (Notion → Convex) | ~2 weeks | `/admin/bookings` full pipeline UI (kanban + table + calendar). One-time data migration. `/bookingform` cuts over to Convex. |
| **3** | Tasks + Projects + Calendar | ~3 weeks | `/admin/tasks`, `/admin/projects`, `/admin/calendar`. Calendar = derived from bookings + project milestones + small manual `events` table, exposed as `.ics` feed for iPhone subscription. |
| **4** | Discussions (replaces Notion Message Hub) | ~2 weeks | Per-entity threads attached to bookings/tasks/projects, plus aggregator view at `/admin/discussions` for Chris's "see everything" use. |
| **5** | Notion fully retired | ~half week | Final data validation, sunset Notion subscription. |

**Sub-project sequencing principle:** vertical slices that deliver value at each step. MailChimp gets cancelled at the end of #1c (~7 weeks in). Bookings stay on Notion until #2; tasks/projects/calendar stay on Notion until #3; Message Hub stays until #4. During the migration period, each entity has exactly one canonical home — no dual-writes — and the source of truth migrates one module at a time.

---

## Architecture

```
                    ┌────────────────────────────────────┐
                    │  CONVEX (canonical data layer)     │
                    │                                    │
                    │  Active in #1a:                    │
                    │  - contacts (Enhancers + future    │
                    │              CRM contacts)         │
                    │  - posts (gated content)           │
                    │                                    │
                    │  Schemas reserved (populated later):│
                    │  - campaigns (#1c)                 │
                    │  - assets (#1b)                    │
                    │  - bookings (#2)                   │
                    │  - tasks (#3)                      │
                    │  - projects (#3)                   │
                    │  - events (#3)                     │
                    │  - discussions, messages (#4)      │
                    └────────────────────────────────────┘
                                   ▲
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
       ┌────────────────┐  ┌──────────────┐   ┌──────────────┐
       │  PUBLIC SITE   │  │  /enhancers  │   │  /admin      │
       │  (existing)    │  │  fan-facing  │   │  team-facing │
       │  homepage,     │  │  magic-link  │   │  Clerk auth  │
       │  setlist,      │  │  via Resend  │   │  role-gated  │
       │  bookingform   │  │              │   │              │
       │  (still Notion │  │              │   │  #1a: shell  │
       │   until #2)    │  │              │   │  + dashboard │
       └────────────────┘  └──────────────┘   └──────────────┘
                                   │                  │
                                   ▼                  ▼
                            ┌─────────────────────────────┐
                            │  RESEND (email send only)   │
                            │  - Welcome / login (#1a)    │
                            │  - Campaigns (#1c)          │
                            └─────────────────────────────┘
```

**Stack:**
- **Next.js 16** App Router (existing)
- **Tailwind CSS 4** (existing)
- **Vercel** deployment (existing)
- **Convex** — typed schemas, queries, mutations, file storage (new)
- **Clerk** — admin auth, organization roles, per-user `privateMetadata` (new, native Vercel + Convex integration)
- **Resend** — transactional + campaign email (existing for booking confirmations, extended)
- **React Email** — branded transactional template (new, Resend-native)
- **`proxy.ts`** (Next.js 16 replacement for `middleware.ts`) — gate `/enhancers/*` and `/admin/*`

**Key principle:** Convex is the canonical writer for all new entities. The existing Notion booking DB stays canonical until #2. No dual-writes across both.

**Repo structure:** All work happens in this single repo (`LME-Website`). Khari adds Chris (and other team members as needed) as GitHub collaborators with write access. Vercel project is shared with collaborators. Chris's existing Electron `Mailchimp app/` (in Dropbox) is harvested for design patterns and CSS but doesn't move into the repo — it gradually retires as features land in `/admin`.

---

## Convex data model

All schemas live in `convex/schema.ts`. Each table below is defined in #1a even if it's not actively read/written this phase, so future modules don't trigger schema rewrites.

### `contacts` (active — Enhancers and future-CRM contacts)

```ts
defineTable({
  email: v.string(),                 // canonical identifier; indexed, unique
  name: v.optional(v.string()),
  source: v.union(                   // where they came from
    v.literal("enhancers-signup"),
    v.literal("booking-inquiry"),
    v.literal("manual"),
  ),
  tags: v.array(v.string()),         // free-form: "enhancer", "client", "venue", "interest:weddings"
  status: v.union(
    v.literal("active"),
    v.literal("unsubscribed"),
    v.literal("bounced"),
  ),
  signupDate: v.number(),            // ms since epoch
  lastActive: v.optional(v.number()),

  // Magic-link state
  magicLinkToken: v.optional(v.string()),    // single-use, cleared on redeem
  magicLinkIssuedAt: v.optional(v.number()),

  // Optional demographic fields (populated later via profile completion)
  ageRange: v.optional(v.string()),
  location: v.optional(v.string()),
  notes: v.optional(v.string()),
})
.index("by_email", ["email"])
.index("by_magic_token", ["magicLinkToken"])
```

### `posts` (active — Enhancer content)

In #1a: posts created manually via the Convex dashboard or a tiny `/admin/posts/new` form. In #1c: sent campaigns auto-mirror here.

```ts
defineTable({
  title: v.string(),
  slug: v.string(),                  // unique, indexed
  status: v.union(
    v.literal("draft"),
    v.literal("published"),
    v.literal("archived"),
  ),
  type: v.union(                     // only "post" rendered in #1a; rest reserved
    v.literal("post"),
    v.literal("mix"),
    v.literal("listen-link"),
    v.literal("feedback-request"),
  ),
  featured: v.boolean(),             // hero slot on /enhancers if true
  publishedDate: v.optional(v.number()),
  heroImageUrl: v.optional(v.string()),
  excerpt: v.optional(v.string()),
  bodyHtml: v.string(),              // rendered HTML body
  embedUrls: v.array(v.string()),    // SoundCloud / YouTube embed sources

  // Reserved for #1c
  campaignId: v.optional(v.id("campaigns")),
})
.index("by_slug", ["slug"])
.index("by_status_and_date", ["status", "publishedDate"])
```

### `campaigns` (reserved — populated in #1c)

```ts
defineTable({
  subjectLine: v.string(),
  sentDate: v.number(),
  sentBy: v.string(),                // Clerk user ID
  recipientCount: v.number(),
  recipientTags: v.array(v.string()),
  bodyHtml: v.string(),
  resendMessageId: v.optional(v.string()),
  linkedPostId: v.optional(v.id("posts")),
})
```

### `assets` (reserved — populated in #1b)

```ts
defineTable({
  type: v.union(v.literal("photo"), v.literal("audio"), v.literal("video")),
  dropboxPath: v.optional(v.string()),
  cdnUrl: v.string(),                // public, served via Convex file storage
  caption: v.optional(v.string()),
  tags: v.array(v.string()),
  event: v.optional(v.string()),     // e.g. "flashback-fete"
  date: v.optional(v.number()),
  externalUrl: v.optional(v.string()),  // SoundCloud / YouTube URL for non-uploaded media
})
```

### `bookings` (reserved — populated in #2)

```ts
defineTable({
  // Core (from existing booking form)
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

  // Pipeline state (from Notion bookings DB — beyond what website code writes)
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
  editToken: v.string(),             // for /bookingform/edit/[token]

  // Full booking detail (matches existing buildPageBody fields)
  // ... clientAddress, dayOfContact, venueDetails, accessRestrictions, soundcheckTime, etc.
  // (Schema completed in #2's spec; reserved here as v.optional(v.any()) placeholder)
  detailsBlob: v.optional(v.any()),

  contactId: v.optional(v.id("contacts")),  // link booking to a contact
})
.index("by_edit_token", ["editToken"])
.index("by_status_and_date", ["status", "eventDate"])
```

### `tasks`, `projects`, `events`, `discussions`, `messages` (reserved — populated in #3 and #4)

Schemas sketched here so #1a's setup migrations include them. Detailed in their own specs when each sub-project starts.

```ts
// tasks
defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  status: v.union(/* not-started, waiting-to-start, in-progress, waiting-for-feedback, done, delay, cancelled */),
  priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  tags: v.array(v.string()),  // "admin", "finance", "events", "music"
  dueDate: v.optional(v.number()),
  assigneeUserId: v.optional(v.string()),  // Clerk user ID
  projectId: v.optional(v.id("projects")),
})

// projects
defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  category: v.array(v.string()),  // "pop-ups", "main-shows", "bookings", "content-making"
  priority: v.optional(v.string()),
  dueDate: v.optional(v.number()),
})

// events (manual calendar entries beyond bookings/projects)
defineTable({
  title: v.string(),
  start: v.number(),
  end: v.optional(v.number()),
  details: v.optional(v.string()),
  url: v.optional(v.string()),
  type: v.union(v.literal("rehearsal"), v.literal("meeting"), v.literal("gig"), v.literal("other")),
})

// discussions
defineTable({
  title: v.string(),
  category: v.string(),     // "announcements", "general", "bookings", "shows", "music", etc.
  status: v.union(v.literal("active"), v.literal("inactive"), v.literal("archived")),
  members: v.array(v.string()),   // Clerk user IDs
  lastActivity: v.number(),
  // Optional relations — a discussion attaches to one entity, or stands alone
  bookingId: v.optional(v.id("bookings")),
  taskId: v.optional(v.id("tasks")),
  projectId: v.optional(v.id("projects")),
})

// messages (the actual posts inside a discussion)
defineTable({
  discussionId: v.id("discussions"),
  authorUserId: v.string(),
  bodyHtml: v.string(),
  createdAt: v.number(),
})
.index("by_discussion", ["discussionId", "createdAt"])
```

---

## Auth model

Two surfaces, two auth systems — picked to match each audience's friction tolerance.

### `/enhancers/*` — custom magic-link via Resend

For fans. Email-only signup. No account creation. No password.

- Signup mutation issues a UUID v4 `magicLinkToken`, stores on the contact, sends email via Resend with link `https://lmeband.com/enhancers/auth?token=...`
- Token: single-use, cleared on redeem, expires 7 days after issuance
- Session cookie `enh_session` after redeem: HMAC-signed using `ENHANCERS_SESSION_SECRET`, contains the contact's Convex `_id`, `HttpOnly`/`Secure`/`SameSite=Lax`, `Max-Age = 60 days`, auto-refresh on each authenticated request
- Sign-out: `POST /api/enhancers/logout` clears the cookie

### `/admin/*` — Clerk auth + Organization roles

For the band team (~6 people). Real auth: email/password, MFA optional, organization-scoped.

- Clerk installed via Vercel Marketplace (one-click, env vars auto-provisioned)
- Single Clerk Organization: "LME Band"
- Two roles in #1a: `admin` (full access) and `viewer` (read-only). Permissions on individual screens use Clerk's role-check helpers
- Per-user Anthropic key: stored in Clerk `privateMetadata.anthropicApiKey` (encrypted at rest, server-only). When the AI composer launches in #1b, the server reads `currentUser.privateMetadata.anthropicApiKey`; if absent, falls back to `process.env.ANTHROPIC_API_KEY` (Chris's key)
- Convex Clerk integration: native — Convex's `auth.getUserIdentity()` works directly with the Clerk session

### Cross-link between systems

A Clerk admin user can also be a fan. We don't auto-link — but if a row in `contacts` has the same email as a Clerk user, downstream code can join them. No code does this in #1a.

---

## User flows

### Flow 1 — Enhancers signup

1. Visitor on the public site sees a signup card. Placements: a thin band in the homepage hero area + a dedicated section in the site footer (no popups, on-brand).
2. Enters email → "Become an Enhancer".
3. Server runs Convex mutation `signupEnhancer({ email })`:
   - Validate email format.
   - Look up by email (indexed).
   - If no match → create row with `source = "enhancers-signup"`, `tags = ["enhancer"]`, `status = "active"`.
   - If match with `status = "active"` → no-op create, treat as login request.
   - If match with `status = "unsubscribed"` → re-activate.
   - Generate UUID v4 magic-link token, set `magicLinkToken` and `magicLinkIssuedAt`.
   - Schedule the welcome/login email (Convex action calling Resend).
4. Show success state: "Check your email — we just sent you a link." (Don't reveal whether it was new vs returning.)

### Flow 2 — Magic-link redemption

1. Click link in email → land on `/enhancers/auth?token=...`.
2. Server runs Convex mutation `redeemMagicLink({ token })`:
   - Look up by `magicLinkToken` (indexed).
   - If no match or `magicLinkIssuedAt` > 7 days ago → return error.
   - On success: clear `magicLinkToken`, set `lastActive = now`. Return contact `_id`.
3. Server sets signed cookie `enh_session = {contactId}` with 60-day expiry.
4. Redirect to `/enhancers`.

### Flow 3 — Browse `/enhancers`

1. Authenticated request → `proxy.ts` reads cookie → verifies HMAC and contact existence (cached read).
2. Page Server Component runs Convex query `getPublishedPosts()`:
   - Returns published posts, sorted by `publishedDate` descending.
3. Render hybrid layout: featured post in hero slot (or most recent if none flagged), 6 most-recent in a card grid below.
4. Click into a post → `/enhancers/posts/[slug]` → render `bodyHtml` inside LME site chrome with embeds inline.

### Flow 4 — Admin login (Clerk)

1. Team member visits `/admin` directly, or via an invitation link.
2. Clerk handles sign-in/sign-up flow at `/admin/sign-in` (Clerk-hosted UI).
3. After auth, `proxy.ts` checks the user's Clerk Organization membership and role.
4. If member with role `admin` or `viewer` → render `/admin`. Otherwise → "Not authorized" page with a "request access" link to Khari.
5. Khari adds new team members via the Clerk dashboard (no UI for invitations needed in #1a).

### Flow 5 — `/admin` dashboard (#1a only — minimal shell)

`/admin` lands on a dashboard with:
- Total Enhancers count, signups in last 7/30 days
- "Recent signups" list (last 10 contacts)
- Empty placeholders for: Bookings, Tasks, Compose — labelled "coming in sub-project #N"
- Link to Clerk's user-profile page for managing the user's own account

No CRUD operations in #1a beyond what the Enhancers signup flow already triggers. Subsequent sub-projects fill in real screens.

### Flow 6 — Profile completion (deferred but linked from welcome email)

The welcome email contains a "tell us about yourself" link. In #1a this points to a Notion-hosted form (existing Notion still works during this phase) that updates demographics. Branded site form for this lands in #1b.

---

## Routes

### Pages (Next.js App Router)

| Route | Purpose | Auth |
|---|---|---|
| `/enhancers` | Gated landing — featured + recent grid | Magic-link cookie |
| `/enhancers/posts/[slug]` | Gated post detail | Magic-link cookie |
| `/enhancers/login` | "Enter email, we'll send a link" | Public |
| `/enhancers/auth` | Magic-link redemption (no UI; redirects) | Public (token in URL) |
| `/enhancers/check-email` | "Check your inbox" confirmation | Public |
| `/admin` | Dashboard (counts, recent signups) | Clerk + role |
| `/admin/sign-in` | Clerk sign-in (Clerk-hosted) | Public |

### Convex functions (queries and mutations)

| Function | Type | Purpose |
|---|---|---|
| `signupEnhancer({ email })` | mutation | Create or re-activate, issue magic link, schedule email |
| `loginEnhancer({ email })` | mutation | For existing contacts: issue magic link, schedule email |
| `redeemMagicLink({ token })` | mutation | Validate token, clear it, return contact ID |
| `getPublishedPosts({ limit })` | query | Posts list for `/enhancers` |
| `getPostBySlug({ slug })` | query | Single post for detail page |
| `getEnhancersDashboardStats()` | query | Total + recent signups, used on `/admin` |
| `getRecentSignups({ limit })` | query | Recent contacts for the dashboard list |

### Auth gating (`proxy.ts`)

Single `proxy.ts` at the project root handles both auth systems:

- `/enhancers/*` (excluding `login`, `auth`, `check-email`) → require `enh_session` cookie; verify HMAC; redirect to `/enhancers/login` on fail
- `/admin/*` (excluding `sign-in`) → use Clerk's middleware helper to require auth; check organization role; redirect to `/admin/sign-in` or "Not authorized" page

---

## Cookie & token security

- **Magic-link token:** UUID v4, single-use (cleared on redemption), 7-day expiry from issuance
- **Session cookie:** HMAC-signed via `ENHANCERS_SESSION_SECRET`, contains contact ID, `HttpOnly`/`Secure`/`SameSite=Lax`, 60-day rolling expiry
- **Rate limiting:** signup/login mutations limit to ~5 requests per IP per 10 minutes (Convex action with simple in-memory counter or middleware-level limiter)
- **Clerk session:** managed entirely by Clerk; standard configuration

---

## Email

Welcome / login email built once with **React Email** (Resend's official component library, native to the stack). Components:

- LME wordmark header (Bebas Neue, dark background, teal accent — matches site brand)
- Greeting: "You're in." for first-time signups, "Welcome back." for returning logins
- One-tap CTA button → magic link
- Plain-text fallback link (for email clients that don't render the button)
- Footer: unsubscribe link, social links, "you're getting this because…"

`From: enhancers@lmeband.com` (new sender; existing `info@lmeband.com` continues for booking confirmations).

The campaign template (used by #1c for actual marketing emails) is a separate React Email component built later. The transactional template ships in #1a.

---

## Brand & UX notes

- The Enhancers area should feel **like a continuation of the public site**, not a separate product. Same dark editorial aesthetic, same teal accent, same Bebas Neue + body type stack.
- Signup card placements: a thin band in the homepage hero area + a dedicated section in the site footer. No popups.
- Hero post on `/enhancers`: large image, short title, no excerpt — make the post itself the click. The grid below is for browsing the back catalogue.
- Post detail pages render a "View on web" comment near the top so emailed-and-then-opened-in-browser posts feel coherent (in #1c the email's "view in browser" link points here).
- `/admin` uses a sister design system to the public site — same fonts and colors, but a denser data-table aesthetic. Chris's existing `lme-mail` Electron app's `styles.css` is the reference: sidebar nav, dark theme, Space Mono mono labels.

---

## Open decisions confirmed

Captured for the record so the implementation plan doesn't relitigate them:

| Decision | Choice |
|---|---|
| Community brand name | **Enhancers** |
| Auth (fans) | Custom magic-link via Resend, 60-day session |
| Auth (admin) | Clerk + Organization roles (admin / viewer) |
| Per-admin Anthropic key | Clerk `privateMetadata.anthropicApiKey`, fallback to env var (Chris's key) |
| Signup data | Email only; demographics later via profile completion |
| Page layout (`/enhancers`) | Hybrid — featured drop + recent grid |
| Composer location (later) | `/admin/compose` on the website (not Chris's Electron app) |
| Data layer | **Convex** for all new entities; Notion stays canonical for bookings until #2 |
| File storage | Dropbox = raw / source-of-truth files; Convex file storage = CDN-served copies |
| Calendar (later) | `.ics` feed published from Convex, members subscribe on iPhone Calendar |
| Message Hub (later) | Replaced by per-entity discussions + aggregator view at `/admin/discussions` |
| iCloud calendar bidirectional sync | Rejected (Apple APIs hostile); one-way `.ics` instead |
| Off-the-shelf CRM (HubSpot/Folk) | Rejected — modular custom build (Path C) |
| Repo structure | Single repo `LME-Website`. Chris added as collaborator. Vercel project shared. |
| Chris's Electron `lme-mail` app | Stays operational during #1a-#1c for actual MailChimp-style sends. Harvested for design/CSS. Retired at end of #1c. |

---

## Out of scope for #1a

Each of these belongs to a later sub-project and gets its own spec:

- AI-driven email composer (`/admin/compose`) — #1b
- Asset library — Photos, Audio, Video DBs + Dropbox sync + Convex file storage — #1b
- React Email branded **campaign** template — #1c
- Resend send pipeline + writing into `campaigns` table — #1c
- Branded site form for profile completion — #1b
- Category filter UI on `/enhancers` (chips/tabs) — when content volume justifies
- Webhook handling for Resend opens/clicks/bounces — #1c
- Bookings migration + `/admin/bookings` — #2
- Tasks + Projects + Calendar — #3
- `.ics` feed export — #3
- Discussions / Message Hub replacement — #4
- Notion final retirement — #5
- SMS/WhatsApp blasts, EPK page, full client portal — separate roadmap, not yet planned

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Convex learning curve slows #1a | Use Convex's well-documented quickstart; keep schemas simple in #1a; defer complex queries to later phases |
| Clerk and Convex integration friction | Use the official Convex+Clerk integration template; no custom auth glue |
| Session cookie secret leak | `ENHANCERS_SESSION_SECRET` rotated via Vercel env; rotation invalidates all sessions, users re-link |
| Magic links forwarded / shared | Single-use tokens; once redeemed, cookie is on one device |
| Notion booking system disturbed during #1a | #1a doesn't touch booking code or Notion; safety guaranteed |
| Email deliverability for `enhancers@lmeband.com` | Configure SPF/DKIM via Resend domain setup before first send; warm up sending volume |
| Convex free tier limits | Generous (1M function calls/mo, 1GB storage); paid plan ~$25/mo if exceeded |

---

## Acceptance criteria

#1a is done when:

1. A new visitor can sign up at the homepage with their email and receive a working magic-link email within 30 seconds.
2. Clicking the magic link sets a session and redirects to `/enhancers`, which displays a featured post and a grid of additional posts read live from Convex.
3. Returning within 60 days reaches `/enhancers` with no prompt; after 60 days, they're guided to request a new link.
4. Posts created in Convex (status set to `published`) appear on `/enhancers` immediately (Convex queries are reactive).
5. Unauthenticated traffic to `/enhancers/*` is redirected to `/enhancers/login`.
6. Khari and Chris can sign in via Clerk at `/admin/sign-in`, land on the `/admin` dashboard, and see live counts of total Enhancers and recent signups.
7. Unauthenticated traffic to `/admin/*` is redirected to `/admin/sign-in`.
8. The Convex schema includes all reserved tables (campaigns, assets, bookings, tasks, projects, events, discussions, messages) — no migrations required for #1b–#5 to extend them.
9. The existing `/bookingform` flow (Notion-backed) continues to work unchanged — no regression.
10. Three real Enhancer posts have been authored and are rendering on `/enhancers`.
