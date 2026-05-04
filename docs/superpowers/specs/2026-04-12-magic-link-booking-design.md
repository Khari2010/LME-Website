# Magic Link Booking System — Phase 1 Design Spec

## Overview

Allow clients to return and update their booking form details via a unique magic link. On first submission, send a branded confirmation email with the link. All data stays in the existing Notion database.

**Phase 1 scope:** Editable bookings + confirmation email. Change notifications (Phase 2) and client portal with documents (Phase 3) are out of scope.

---

## Data Model

**No new databases.** One new property added to the existing Notion booking database:

| Property | Type | Purpose |
|---|---|---|
| `Edit Token` | `rich_text` | Stores a UUID v4 generated on submission |

The edit URL format: `https://lmeband.com/bookingform/edit/{token}`

To look up a booking, the API queries the Notion DB filtering where `Edit Token` equals the token from the URL.

---

## API Routes

### `POST /api/submit` (existing — modified)

Current behaviour plus:
1. Generate a UUID v4 token
2. Store it as the `Edit Token` property on the created Notion page
3. Send a confirmation email via Resend (see Email section)
4. Return `{ success: true, token: "..." }` in the response

### `GET /api/booking/[token]` (new)

1. Query Notion DB: filter where `Edit Token` equals `token` param
2. If no match: return `404`
3. Read the page properties and map them back to the form data shape:
   - `Client Name` (rich_text) → `clientName`
   - `Client Email` (email) → `email`
   - `Client Phone` (phone_number) → `contactNumber`
   - `Venue` (rich_text) → `venueName`
   - `Event Type` (select) → `eventType`
   - `Event Date` (date) → `eventDate`
   - `Expected Guests` (number) → `expectedGuests`
   - `Genres` (multi_select) → `genres[]`
   - `DJ Required` (checkbox) → `djRequired`
4. For fields not stored as top-level Notion properties (venue address, parking, sound limiter, access details, etc.), read the page body blocks and parse them back into key-value pairs from the `"Label: Value"` paragraph format
5. Return the full form data as JSON

### `PUT /api/booking/[token]` (new)

1. Query Notion DB: filter where `Edit Token` equals `token` param
2. If no match: return `404`
3. Get the Notion page ID from the query result
4. Update page properties with new values (same property mapping as POST)
5. Delete all existing page body blocks
6. Rebuild page body blocks using the same `buildPageBody()` function
7. Return `{ success: true }`

---

## Pages

### `/bookingform` (existing — modified)

**Create mode.** Changes:
- On successful submit, the API now returns `{ token }` in the response
- The "WE GOT YOU" success screen is updated to include:
  - The magic link as a clickable URL
  - A "Copy Link" button that copies the URL to clipboard
  - Text: "Save this link to update your booking details anytime"
  - Existing email/contact info stays

### `/bookingform/edit/[token]` (new)

**Edit mode.** A new Next.js page at `src/app/bookingform/edit/[token]/page.tsx`:
- On load: calls `GET /api/booking/[token]` to fetch existing data
- Shows a loading state while fetching
- If 404: shows "Booking not found" error page
- If success: renders the same booking form, pre-filled with existing data
- Submit button text: "UPDATE BOOKING"
- On submit: calls `PUT /api/booking/[token]`
- Success screen: "Booking updated" message with the same magic link

### Form Component Refactor

Extract the form UI from `bookingform/page.tsx` into a shared component:

**`src/components/BookingForm.tsx`**
- Accepts props:
  - `initialData?: FormData` — pre-fill values (undefined for create mode)
  - `mode: "create" | "edit"`
  - `onSubmit: (data: FormData) => Promise<{ token?: string }>`
- Contains all the form sections, field components, validation, and styling
- The parent pages handle the API calls and success/error screens

The helper components (`ToggleGroup`, `GenreCard`, `SectionHeader`, `Field`) move into this file or stay inline — no need to split them further.

---

## Email

### Provider

**Resend** — React email templates, simple API, generous free tier.

### Configuration

- **From address:** `info@lmeband.com`
- **CC:** `info@lmeband.com` (so LME sees every confirmation sent)
- **Reply-to:** `info@lmeband.com`

### DNS Setup Required

Verify `lmeband.com` domain in Resend. This requires adding DNS records (DKIM, SPF) to the domain's DNS settings. This is a one-time setup step done in Resend dashboard + domain registrar.

### Environment Variables

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key for sending emails |

Added to Vercel environment variables alongside existing `NOTION_API_KEY` and `NOTION_DATABASE_ID`.

### Confirmation Email Content

**Subject:** `Booking Received — {Client Name} | LME`

**Body:**
- LME logo (hosted on the site, referenced by URL)
- Heading: "We Got You"
- Body text: "Your booking form has been received. We'll review your details and be in touch with a Performance Contract for signing."
- Key details summary:
  - Client name
  - Event type
  - Event date
  - Venue
- CTA button: "View or Edit Your Booking" → links to magic URL
- Footer: "Questions? Email info@lmeband.com"

**Template:** Built as a React component using `@react-email/components` for cross-client compatibility. Styled to match LME brand (dark background, teal accents).

### When Emails Are Sent

- **On first submission only** (Phase 1)
- No email on updates — that's Phase 2 (change notification emails to LME)

---

## Security

- **Access control:** The UUID token is the sole access mechanism. UUIDs are 128-bit random values — effectively unguessable.
- **No authentication system** — no passwords, accounts, or sessions.
- **Same pattern as:** Google Forms "edit your response" links, Calendly booking edit links.
- **Revocation:** To revoke access to a specific booking, clear the `Edit Token` value in Notion. The GET/PUT routes will return 404.
- **Rate limiting:** Not implemented in Phase 1. Notion's own API rate limits (3 requests/second) provide a natural backstop.

---

## File Changes Summary

| File | Change |
|---|---|
| `src/app/api/submit/route.ts` | Add token generation, store in Notion, send Resend email, return token |
| `src/app/api/booking/[token]/route.ts` | New — GET (fetch booking) and PUT (update booking) |
| `src/app/bookingform/page.tsx` | Refactor form into shared component, update success screen with magic link |
| `src/app/bookingform/edit/[token]/page.tsx` | New — edit mode page, fetches data and renders shared form |
| `src/components/BookingForm.tsx` | New — extracted form component with create/edit modes |
| `src/emails/BookingConfirmation.tsx` | New — React email template for confirmation |
| `package.json` | Add `resend` and `@react-email/components` dependencies |

---

## Future Phases (out of scope)

**Phase 2 — Change Notifications:**
- Email LME when a client updates their booking
- Flag critical changes (date changes, changes within 30 days of event)
- Diff summary showing what changed

**Phase 3 — Client Portal:**
- Client can view uploaded contracts/documents from Notion
- Status visibility (enquiry → confirmed → contracted)
- Richer portal UI beyond just the form
