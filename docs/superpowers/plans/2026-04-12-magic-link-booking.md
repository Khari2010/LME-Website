# Magic Link Booking System — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow clients to edit their booking form via a unique magic link, with a branded confirmation email sent on first submission.

**Architecture:** Extend the existing Notion-backed booking form with a UUID token stored per booking. New API routes fetch and update bookings by token. Resend sends branded confirmation emails. The form component is extracted and shared between create and edit pages.

**Tech Stack:** Next.js 16 (App Router), Notion API, Resend + @react-email/components, TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/booking-types.ts` | Create | Shared TypeScript types for form data |
| `src/lib/notion.ts` | Create | Notion API helpers: create, query-by-token, update, parse properties |
| `src/lib/email.ts` | Create | Resend email sending function |
| `src/emails/BookingConfirmation.tsx` | Create | React email template for confirmation |
| `src/components/BookingForm.tsx` | Create | Extracted form component (create + edit modes) |
| `src/app/api/submit/route.ts` | Modify | Add token generation, Resend email, return token |
| `src/app/api/booking/[token]/route.ts` | Create | GET (fetch booking) and PUT (update booking) |
| `src/app/bookingform/page.tsx` | Modify | Use shared form component, update success screen |
| `src/app/bookingform/edit/[token]/page.tsx` | Create | Edit mode page |
| `package.json` | Modify | Add resend and @react-email/components deps |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install resend and react-email**

```bash
cd /Users/khari/Documents/GitHub/LME-Website
pnpm add resend @react-email/components
```

- [ ] **Step 2: Verify installation**

```bash
pnpm ls resend @react-email/components
```

Expected: Both packages listed with versions.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add resend and react-email dependencies"
```

---

### Task 2: Create Shared Types

**Files:**
- Create: `src/lib/booking-types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/lib/booking-types.ts

export interface BookingFormData {
  // Client Details
  clientName: string;
  email: string;
  contactNumber: string;
  clientAddress?: string;
  dayOfContactName?: string;
  dayOfContactNumber?: string;

  // Event Details
  eventType: string;
  eventDate: string;
  personCelebrated?: string;
  eventStartTime?: string;
  guestArrivalTime?: string;
  venueCurfew?: string;
  expectedGuests?: string;

  // Venue Details
  venueName: string;
  venueAddress?: string;
  venueContactName?: string;
  venueContactNumber?: string;
  earliestAccessTime?: string;
  powerSupply?: string;

  // Toggles (stored as strings: "Yes" | "No" | "Not Sure")
  parking?: string;
  soundLimiter?: string;
  stepFreeAccess?: string;

  // Load-in & Access
  accessRestrictions?: string;
  vehicleDistance?: string;
  unloadingPoint?: string;

  // Performance Details
  soundcheckTime?: string;
  djRequired?: string;
  djSetTimings?: string;
  djGenres?: string;

  // Genre Preferences
  genres: string[];
  otherGenres?: string;

  // Special Requests
  specialRequests?: string;
}

export interface BookingPayload extends BookingFormData {
  [key: string]: string | string[] | undefined;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/booking-types.ts
git commit -m "feat: add shared booking form types"
```

---

### Task 3: Create Notion Helpers

**Files:**
- Create: `src/lib/notion.ts`
- Reference: `src/app/api/submit/route.ts` (existing patterns)

This file centralises all Notion API interactions so the route handlers stay thin.

- [ ] **Step 1: Create the Notion helper module**

```typescript
// src/lib/notion.ts

import { BookingFormData } from "./booking-types";

const NOTION_API_KEY = () => process.env.NOTION_API_KEY!;
const NOTION_DATABASE_ID = () => process.env.NOTION_DATABASE_ID!;

const notionHeaders = () => ({
  Authorization: `Bearer ${NOTION_API_KEY()}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

// --- Build Notion properties from form data ---

export function buildProperties(data: BookingFormData, token?: string) {
  const bookingTitle = `${data.clientName || "Unknown"} — ${data.eventType || "Event"}`;
  const genresArray = (data.genres || []).map((g: string) => ({ name: g }));

  const properties: Record<string, unknown> = {
    "Booking ": {
      title: [{ text: { content: bookingTitle } }],
    },
    Status: {
      select: { name: "Enquiry" },
    },
    "Client Name ": {
      rich_text: [{ text: { content: data.clientName || "" } }],
    },
    "Client Email": {
      email: data.email || null,
    },
    "Client Phone": {
      phone_number: data.contactNumber || null,
    },
    Venue: {
      rich_text: [{ text: { content: data.venueName || "" } }],
    },
    "Expected Guests": {
      number: data.expectedGuests ? parseInt(data.expectedGuests, 10) : null,
    },
    Genres: {
      multi_select: genresArray,
    },
    "DJ Required ": {
      checkbox: data.djRequired === "Yes",
    },
  };

  if (data.eventType) {
    properties["Event Type"] = { select: { name: data.eventType } };
  }
  if (data.eventDate) {
    properties["Event Date"] = { date: { start: data.eventDate } };
  }
  if (token) {
    properties["Edit Token"] = {
      rich_text: [{ text: { content: token } }],
    };
  }

  return properties;
}

// --- Build page body blocks ---

function heading(text: string) {
  return {
    object: "block" as const,
    type: "heading_2" as const,
    heading_2: {
      rich_text: [{ type: "text" as const, text: { content: text } }],
    },
  };
}

function paragraph(label: string, value?: string) {
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: {
      rich_text: [
        {
          type: "text" as const,
          text: { content: `${label}: ` },
          annotations: { bold: true },
        },
        { type: "text" as const, text: { content: value || "—" } },
      ],
    },
  };
}

function divider() {
  return {
    object: "block" as const,
    type: "divider" as const,
    divider: {},
  };
}

export function buildPageBody(d: BookingFormData) {
  const blocks = [];

  blocks.push(heading("Client Details"));
  blocks.push(paragraph("Client Name", d.clientName));
  blocks.push(paragraph("Email", d.email));
  blocks.push(paragraph("Contact Number", d.contactNumber));
  blocks.push(paragraph("Client Address", d.clientAddress));
  blocks.push(paragraph("Day-of Contact Name", d.dayOfContactName));
  blocks.push(paragraph("Day-of Contact Number", d.dayOfContactNumber));
  blocks.push(divider());

  blocks.push(heading("Event Details"));
  blocks.push(paragraph("Event Type", d.eventType));
  blocks.push(paragraph("Event Date", d.eventDate));
  blocks.push(paragraph("Person(s) Celebrated", d.personCelebrated));
  blocks.push(paragraph("Event Start Time", d.eventStartTime));
  blocks.push(paragraph("Guest Arrival Time", d.guestArrivalTime));
  blocks.push(paragraph("Venue Curfew", d.venueCurfew));
  blocks.push(paragraph("Expected Guests", d.expectedGuests));
  blocks.push(divider());

  blocks.push(heading("Venue Details"));
  blocks.push(paragraph("Venue Name", d.venueName));
  blocks.push(paragraph("Venue Address", d.venueAddress));
  blocks.push(paragraph("Venue Contact Name", d.venueContactName));
  blocks.push(paragraph("Venue Contact Number", d.venueContactNumber));
  blocks.push(paragraph("Earliest Building Access Time", d.earliestAccessTime));
  blocks.push(paragraph("Power Supply", d.powerSupply));
  blocks.push(paragraph("On-site Parking", d.parking));
  blocks.push(paragraph("Sound Limiter", d.soundLimiter));
  blocks.push(divider());

  blocks.push(heading("Load-in & Access"));
  blocks.push(paragraph("Step-free / Ground-level Access", d.stepFreeAccess));
  blocks.push(paragraph("Access Restrictions", d.accessRestrictions));
  blocks.push(paragraph("Distance from Vehicle to Performance Area", d.vehicleDistance));
  blocks.push(paragraph("Nearest Vehicle Unloading Point", d.unloadingPoint));
  blocks.push(divider());

  blocks.push(heading("Performance Details"));
  blocks.push(paragraph("Preferred Soundcheck Start Time", d.soundcheckTime));
  blocks.push(paragraph("DJ Required", d.djRequired));
  if (d.djRequired === "Yes") {
    blocks.push(paragraph("DJ Set Timings", d.djSetTimings));
    blocks.push(paragraph("Genres for DJ", d.djGenres));
  }
  blocks.push(divider());

  blocks.push(heading("Genre Preferences"));
  blocks.push(paragraph("Selected Genres", (d.genres || []).join(", ")));
  blocks.push(paragraph("Other Genres / Specific Songs", d.otherGenres));
  blocks.push(divider());

  blocks.push(heading("Special Requests"));
  blocks.push({
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: {
      rich_text: [
        {
          type: "text" as const,
          text: { content: d.specialRequests || "—" },
        },
      ],
    },
  });

  return blocks;
}

// --- Create a booking page in Notion ---

export async function createBooking(data: BookingFormData, token: string) {
  const properties = buildProperties(data, token);
  const children = buildPageBody(data);

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: NOTION_DATABASE_ID() },
      properties,
      children,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error("Notion API error:", JSON.stringify(err));
    throw new Error("Failed to create booking in Notion");
  }

  return response.json();
}

// --- Query booking by edit token ---

export async function getBookingByToken(token: string) {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID()}/query`,
    {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify({
        filter: {
          property: "Edit Token",
          rich_text: { equals: token },
        },
        page_size: 1,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to query Notion");
  }

  const result = await response.json();
  if (!result.results || result.results.length === 0) {
    return null;
  }

  return result.results[0];
}

// --- Parse Notion page properties back to BookingFormData ---

export function parseNotionPage(page: Record<string, unknown>): BookingFormData {
  const props = page.properties as Record<string, Record<string, unknown>>;

  const getText = (prop: Record<string, unknown> | undefined): string => {
    if (!prop) return "";
    if (prop.type === "rich_text") {
      const arr = prop.rich_text as Array<{ plain_text: string }>;
      return arr?.[0]?.plain_text || "";
    }
    if (prop.type === "title") {
      const arr = prop.title as Array<{ plain_text: string }>;
      return arr?.[0]?.plain_text || "";
    }
    return "";
  };

  return {
    clientName: getText(props["Client Name "]),
    email: (props["Client Email"]?.email as string) || "",
    contactNumber: (props["Client Phone"]?.phone_number as string) || "",
    venueName: getText(props["Venue"]),
    eventType: (
      props["Event Type"]?.select as { name: string } | null
    )?.name || "",
    eventDate: (
      props["Event Date"]?.date as { start: string } | null
    )?.start || "",
    expectedGuests: props["Expected Guests"]?.number
      ? String(props["Expected Guests"].number)
      : "",
    genres: (
      (props["Genres"]?.multi_select as Array<{ name: string }>) || []
    ).map((g) => g.name),
    djRequired: (props["DJ Required "]?.checkbox as boolean) ? "Yes" : "No",
  };
}

// --- Read page body blocks and parse label:value pairs ---

export async function getPageBody(
  pageId: string
): Promise<Record<string, string>> {
  const response = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children?page_size=200`,
    {
      method: "GET",
      headers: notionHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to read page body");
  }

  const result = await response.json();
  const data: Record<string, string> = {};

  for (const block of result.results) {
    if (block.type === "paragraph" && block.paragraph?.rich_text?.length >= 2) {
      const labelPart = block.paragraph.rich_text[0]?.plain_text || "";
      const valuePart = block.paragraph.rich_text[1]?.plain_text || "";

      if (labelPart.endsWith(": ") && valuePart !== "—") {
        const label = labelPart.slice(0, -2); // Remove trailing ": "
        data[label] = valuePart;
      }
    }
  }

  return data;
}

// Map page body labels back to form field keys
const BODY_LABEL_TO_FIELD: Record<string, keyof BookingFormData> = {
  "Client Address": "clientAddress",
  "Day-of Contact Name": "dayOfContactName",
  "Day-of Contact Number": "dayOfContactNumber",
  "Person(s) Celebrated": "personCelebrated",
  "Event Start Time": "eventStartTime",
  "Guest Arrival Time": "guestArrivalTime",
  "Venue Curfew": "venueCurfew",
  "Venue Address": "venueAddress",
  "Venue Contact Name": "venueContactName",
  "Venue Contact Number": "venueContactNumber",
  "Earliest Building Access Time": "earliestAccessTime",
  "Power Supply": "powerSupply",
  "On-site Parking": "parking",
  "Sound Limiter": "soundLimiter",
  "Step-free / Ground-level Access": "stepFreeAccess",
  "Access Restrictions": "accessRestrictions",
  "Distance from Vehicle to Performance Area": "vehicleDistance",
  "Nearest Vehicle Unloading Point": "unloadingPoint",
  "Preferred Soundcheck Start Time": "soundcheckTime",
  "DJ Set Timings": "djSetTimings",
  "Genres for DJ": "djGenres",
  "Other Genres / Specific Songs": "otherGenres",
  "Special Requests": "specialRequests",
  "Selected Genres": "genres",
};

export function mergeBodyData(
  formData: BookingFormData,
  bodyData: Record<string, string>
): BookingFormData {
  const merged = { ...formData };

  for (const [label, value] of Object.entries(bodyData)) {
    const fieldKey = BODY_LABEL_TO_FIELD[label];
    if (fieldKey) {
      if (fieldKey === "genres") {
        merged.genres = value.split(", ").filter(Boolean);
      } else {
        (merged as Record<string, unknown>)[fieldKey] = value;
      }
    }
  }

  return merged;
}

// --- Update a booking page ---

export async function updateBooking(
  pageId: string,
  data: BookingFormData
) {
  // 1. Update properties (don't change Status or Edit Token)
  const properties = buildProperties(data);
  // Remove Status so we don't overwrite it
  delete properties["Status"];

  const updateRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: notionHeaders(),
    body: JSON.stringify({ properties }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.json();
    console.error("Notion update error:", JSON.stringify(err));
    throw new Error("Failed to update booking properties");
  }

  // 2. Delete existing page body blocks
  const blocksRes = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children?page_size=200`,
    { headers: notionHeaders() }
  );

  if (blocksRes.ok) {
    const blocksData = await blocksRes.json();
    for (const block of blocksData.results) {
      await fetch(`https://api.notion.com/v1/blocks/${block.id}`, {
        method: "DELETE",
        headers: notionHeaders(),
      });
    }
  }

  // 3. Add new page body blocks
  const children = buildPageBody(data);

  // Notion limits appending to 100 blocks per request
  for (let i = 0; i < children.length; i += 100) {
    const chunk = children.slice(i, i + 100);
    await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: "PATCH",
      headers: notionHeaders(),
      body: JSON.stringify({ children: chunk }),
    });
  }
}

// --- Delete all child blocks of a page ---

export async function deletePageBlocks(pageId: string) {
  const blocksRes = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children?page_size=200`,
    { headers: notionHeaders() }
  );

  if (!blocksRes.ok) return;

  const blocksData = await blocksRes.json();
  for (const block of blocksData.results) {
    await fetch(`https://api.notion.com/v1/blocks/${block.id}`, {
      method: "DELETE",
      headers: notionHeaders(),
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/notion.ts
git commit -m "feat: add Notion API helper module for bookings"
```

---

### Task 4: Create Email Template and Sender

**Files:**
- Create: `src/emails/BookingConfirmation.tsx`
- Create: `src/lib/email.ts`

- [ ] **Step 1: Create the React email template**

```tsx
// src/emails/BookingConfirmation.tsx

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Img,
  Hr,
  Button,
} from "@react-email/components";

interface BookingConfirmationProps {
  clientName: string;
  eventType: string;
  eventDate: string;
  venueName: string;
  editUrl: string;
}

export default function BookingConfirmation({
  clientName,
  eventType,
  eventDate,
  venueName,
  editUrl,
}: BookingConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src="https://www.lmeband.com/images/logos/lme-typo-white.png"
              alt="LME — Live Music Enhancers"
              height="40"
            />
          </Section>

          <Text style={heading}>WE GOT YOU</Text>

          <Text style={paragraph}>
            Your booking form has been received. We&apos;ll review your details
            and be in touch with a Performance Contract for signing.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Client</Text>
            <Text style={detailValue}>{clientName}</Text>
            <Text style={detailLabel}>Event Type</Text>
            <Text style={detailValue}>{eventType || "—"}</Text>
            <Text style={detailLabel}>Date</Text>
            <Text style={detailValue}>{eventDate || "—"}</Text>
            <Text style={detailLabel}>Venue</Text>
            <Text style={detailValue}>{venueName || "—"}</Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={ctaButton} href={editUrl}>
              View or Edit Your Booking
            </Button>
          </Section>

          <Text style={smallText}>
            Save this link to update your booking details anytime:
          </Text>
          <Text style={linkText}>
            <Link href={editUrl} style={link}>
              {editUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Questions? Email{" "}
            <Link href="mailto:info@lmeband.com" style={link}>
              info@lmeband.com
            </Link>
          </Text>
          <Text style={footerSmall}>
            &copy; 2026 LME — Live Music Enhancers
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// --- Styles ---

const body = {
  backgroundColor: "#080808",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  margin: "0",
  padding: "0",
};

const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "40px 24px",
};

const logoSection = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const heading = {
  fontSize: "36px",
  fontWeight: "700",
  color: "#5EEAD4",
  textAlign: "center" as const,
  letterSpacing: "0.12em",
  margin: "0 0 16px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#D4D4C8",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const detailsBox = {
  backgroundColor: "#141414",
  borderRadius: "12px",
  padding: "24px",
  marginBottom: "32px",
};

const detailLabel = {
  fontSize: "11px",
  fontWeight: "700",
  color: "#8A8A8A",
  textTransform: "uppercase" as const,
  letterSpacing: "0.2em",
  margin: "0 0 4px",
};

const detailValue = {
  fontSize: "15px",
  color: "#F5F5F0",
  margin: "0 0 16px",
};

const ctaSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const ctaButton = {
  backgroundColor: "#14B8A6",
  color: "#080808",
  fontSize: "14px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  padding: "14px 32px",
  borderRadius: "10px",
  textDecoration: "none",
};

const smallText = {
  fontSize: "13px",
  color: "#8A8A8A",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const linkText = {
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "0 0 32px",
  wordBreak: "break-all" as const,
};

const link = {
  color: "#14B8A6",
};

const hr = {
  borderColor: "#2A2A2A",
  margin: "32px 0",
};

const footer = {
  fontSize: "13px",
  color: "#8A8A8A",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const footerSmall = {
  fontSize: "11px",
  color: "#555",
  textAlign: "center" as const,
  margin: "0",
};
```

- [ ] **Step 2: Create the email sender module**

```typescript
// src/lib/email.ts

import { Resend } from "resend";
import BookingConfirmation from "@/emails/BookingConfirmation";

const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.lmeband.com";

interface SendConfirmationParams {
  to: string;
  clientName: string;
  eventType: string;
  eventDate: string;
  venueName: string;
  token: string;
}

export async function sendBookingConfirmation({
  to,
  clientName,
  eventType,
  eventDate,
  venueName,
  token,
}: SendConfirmationParams) {
  const editUrl = `${BASE_URL}/bookingform/edit/${token}`;

  const { error } = await resend.emails.send({
    from: "LME <info@lmeband.com>",
    to,
    cc: "info@lmeband.com",
    replyTo: "info@lmeband.com",
    subject: `Booking Received — ${clientName} | LME`,
    react: BookingConfirmation({
      clientName,
      eventType,
      eventDate,
      venueName,
      editUrl,
    }),
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error("Failed to send confirmation email");
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/emails/BookingConfirmation.tsx src/lib/email.ts
git commit -m "feat: add booking confirmation email template and sender"
```

---

### Task 5: Update Submit API Route

**Files:**
- Modify: `src/app/api/submit/route.ts`

- [ ] **Step 1: Rewrite the submit route to use shared helpers**

Replace the entire contents of `src/app/api/submit/route.ts` with:

```typescript
// src/app/api/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createBooking } from "@/lib/notion";
import { sendBookingConfirmation } from "@/lib/email";
import type { BookingFormData } from "@/lib/booking-types";

export async function POST(req: NextRequest) {
  const { NOTION_API_KEY, NOTION_DATABASE_ID } = process.env;

  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const data: BookingFormData = await req.json();
    const token = randomUUID();

    await createBooking(data, token);

    // Send confirmation email (non-blocking — don't fail the request if email fails)
    try {
      await sendBookingConfirmation({
        to: data.email,
        clientName: data.clientName,
        eventType: data.eventType,
        eventDate: data.eventDate,
        venueName: data.venueName,
        token,
      });
    } catch (emailError) {
      console.error("Email send failed (booking still created):", emailError);
    }

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/khari/Documents/GitHub/LME-Website && pnpm build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/submit/route.ts
git commit -m "feat: update submit route with token generation and confirmation email"
```

---

### Task 6: Create Booking API Route (GET + PUT)

**Files:**
- Create: `src/app/api/booking/[token]/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/booking/[token]/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  getBookingByToken,
  parseNotionPage,
  getPageBody,
  mergeBodyData,
  updateBooking,
} from "@/lib/notion";
import type { BookingFormData } from "@/lib/booking-types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const page = await getBookingByToken(token);
    if (!page) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Parse properties into form data
    let formData = parseNotionPage(page);

    // Read page body for fields not stored as properties
    const bodyData = await getPageBody(page.id);
    formData = mergeBodyData(formData, bodyData);

    return NextResponse.json({ data: formData });
  } catch (error) {
    console.error("GET booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const page = await getBookingByToken(token);
    if (!page) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const data: BookingFormData = await req.json();
    await updateBooking(page.id, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/khari/Documents/GitHub/LME-Website && pnpm build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/booking/[token]/route.ts
git commit -m "feat: add GET and PUT booking API routes"
```

---

### Task 7: Extract Shared BookingForm Component

**Files:**
- Create: `src/components/BookingForm.tsx`

This is the largest task. We extract the form UI from `bookingform/page.tsx` into a standalone component that works in both create and edit modes.

- [ ] **Step 1: Create the shared form component**

```tsx
// src/components/BookingForm.tsx

"use client";

import { useState } from "react";
import type { BookingFormData } from "@/lib/booking-types";

const GENRES = [
  "70s/80s Disco",
  "90s RnB",
  "00s RnB",
  "Afrobeats",
  "Amapiano",
  "Soca",
  "Gospel",
  "Dancehall",
  "Reggae",
  "Funky House",
  "Electro Dance",
  "Garage",
  "Pop",
];

// --- Sub-components (same as original) ---

function ToggleGroup({
  field,
  options,
  value,
  onChange,
}: {
  field: string;
  options: string[];
  value: string;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(field, opt)}
          className={`flex-1 py-2.5 text-center font-body text-sm font-semibold rounded-lg border transition-all min-h-[44px] cursor-pointer ${
            value === opt
              ? "border-teal-primary bg-teal-primary/8 text-teal-glow"
              : "border-border bg-card text-muted hover:border-teal-deep hover:text-lme-white"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function GenreCard({
  genre,
  selected,
  onToggle,
}: {
  genre: string;
  selected: boolean;
  onToggle: (genre: string) => void;
}) {
  return (
    <label
      className={`relative flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all min-h-[44px] select-none ${
        selected
          ? "border-teal-primary bg-teal-primary/8"
          : "border-border bg-card hover:border-teal-deep"
      }`}
      onClick={() => onToggle(genre)}
    >
      <span
        className={`w-[18px] h-[18px] rounded flex-shrink-0 flex items-center justify-center border-[1.5px] transition-all ${
          selected
            ? "border-teal-primary bg-teal-primary"
            : "border-border"
        }`}
      >
        {selected && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path
              d="M1 5l3.5 3.5L11 1"
              stroke="#080808"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span
        className={`font-body text-sm font-medium ${
          selected ? "text-lme-white" : "text-body"
        }`}
      >
        {genre}
      </span>
    </label>
  );
}

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3.5 mb-7 pb-3.5 border-b-2 border-teal-dark">
      <span className="font-mono text-[0.7rem] font-bold text-teal-mist bg-teal-dark px-2.5 py-1 rounded-full tracking-[0.15em]">
        {num}
      </span>
      <span className="font-display text-[1.6rem] text-lme-white tracking-[0.1em] uppercase">
        {title}
      </span>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  hint,
  full,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-full" : ""}>
      <label className="block font-mono text-[0.68rem] font-bold text-muted uppercase tracking-[0.2em] mb-2">
        {label}
        {required && <span className="text-teal-primary ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[0.78rem] text-muted mt-1.5">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full bg-card border border-border rounded-lg px-3.5 py-3 text-lme-white font-body text-[0.95rem] outline-none transition-colors focus:border-teal-primary placeholder:text-[#555]";

const selectClass =
  "w-full bg-card border border-border rounded-lg px-3.5 py-3 text-lme-white font-body text-[0.95rem] outline-none transition-colors focus:border-teal-primary appearance-none bg-no-repeat bg-[right_14px_center] pr-9";

const selectBg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1.5l5 5 5-5' stroke='%238A8A8A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

// --- Main form component ---

interface BookingFormProps {
  mode: "create" | "edit";
  initialData?: Partial<BookingFormData>;
  onSubmit: (data: BookingFormData) => Promise<{ token?: string }>;
}

export default function BookingForm({
  mode,
  initialData,
  onSubmit,
}: BookingFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    if (!initialData) return {};
    // Extract string fields from initialData
    const strings: Record<string, string> = {};
    for (const [key, value] of Object.entries(initialData)) {
      if (typeof value === "string") {
        strings[key] = value;
      }
    }
    return strings;
  });

  const [toggles, setToggles] = useState<Record<string, string>>(() => {
    if (!initialData) return {};
    const t: Record<string, string> = {};
    for (const key of ["parking", "soundLimiter", "stepFreeAccess", "djRequired"]) {
      if (initialData[key as keyof BookingFormData]) {
        t[key] = initialData[key as keyof BookingFormData] as string;
      }
    }
    return t;
  });

  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialData?.genres || []
  );

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [editToken, setEditToken] = useState("");

  function handleInput(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: false }));
    }
  }

  function handleToggle(field: string, value: string) {
    setToggles((prev) => ({ ...prev, [field]: value }));
  }

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const required = [
      "clientName",
      "email",
      "contactNumber",
      "eventType",
      "eventDate",
      "venueName",
    ];
    const errors: Record<string, boolean> = {};
    let valid = true;
    for (const field of required) {
      if (!formData[field]?.trim()) {
        errors[field] = true;
        valid = false;
      }
    }
    setFieldErrors(errors);

    if (!valid) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        ...toggles,
        genres: selectedGenres,
      } as unknown as BookingFormData;

      const result = await onSubmit(payload);

      if (result.token) {
        setEditToken(result.token);
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(
        "Something went wrong. Please try again or email info@lmeband.com"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://www.lmeband.com";

    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center py-20">
          <h2 className="font-display text-[3.6rem] text-teal-glow tracking-[0.12em] mb-5">
            {mode === "create" ? "WE GOT YOU" : "BOOKING UPDATED"}
          </h2>
          <p className="text-body text-base max-w-[460px] mx-auto leading-relaxed">
            {mode === "create"
              ? "Your booking form has been received. We'll review your details and be in touch with a Performance Contract for signing."
              : "Your booking details have been updated. We'll review the changes."}
            <br />
            <br />
            Questions? Hit us at{" "}
            <a
              href="mailto:info@lmeband.com"
              className="text-teal-primary hover:text-teal-glow transition-colors"
            >
              info@lmeband.com
            </a>
          </p>

          {editToken && (
            <div className="mt-10 bg-card border border-border rounded-xl p-6 max-w-[460px] mx-auto">
              <p className="font-mono text-[0.68rem] font-bold text-muted uppercase tracking-[0.2em] mb-3">
                Your Edit Link
              </p>
              <p className="text-[0.85rem] text-body leading-relaxed mb-4">
                Save this link to update your booking details anytime:
              </p>
              <div className="bg-dark-surface rounded-lg p-3 mb-4 break-all">
                <a
                  href={`${baseUrl}/bookingform/edit/${editToken}`}
                  className="text-teal-primary hover:text-teal-glow transition-colors text-sm font-mono"
                >
                  {baseUrl}/bookingform/edit/{editToken}
                </a>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${baseUrl}/bookingform/edit/${editToken}`
                  );
                }}
                className="font-mono text-xs uppercase tracking-[0.15em] text-teal-primary border border-teal-primary rounded-lg px-4 py-2.5 hover:bg-teal-primary/10 transition-colors cursor-pointer"
              >
                Copy Link
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* 01 — CLIENT DETAILS */}
      <section className="mb-12">
        <SectionHeader num="01" title="CLIENT DETAILS" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Client Name" required>
            <input
              type="text"
              className={`${inputClass} ${fieldErrors.clientName ? "!border-red-400" : ""}`}
              value={formData.clientName || ""}
              onChange={(e) => handleInput("clientName", e.target.value)}
            />
          </Field>
          <Field label="Email Address" required>
            <input
              type="email"
              className={`${inputClass} ${fieldErrors.email ? "!border-red-400" : ""}`}
              value={formData.email || ""}
              onChange={(e) => handleInput("email", e.target.value)}
            />
          </Field>
          <Field label="Contact Number" required>
            <input
              type="tel"
              className={`${inputClass} ${fieldErrors.contactNumber ? "!border-red-400" : ""}`}
              value={formData.contactNumber || ""}
              onChange={(e) => handleInput("contactNumber", e.target.value)}
            />
          </Field>
          <Field label="Client Address">
            <input
              type="text"
              className={inputClass}
              value={formData.clientAddress || ""}
              onChange={(e) => handleInput("clientAddress", e.target.value)}
            />
          </Field>
          <Field label="Day-of Contact Name">
            <input
              type="text"
              className={inputClass}
              value={formData.dayOfContactName || ""}
              onChange={(e) => handleInput("dayOfContactName", e.target.value)}
            />
          </Field>
          <Field label="Day-of Contact Number">
            <input
              type="tel"
              className={inputClass}
              value={formData.dayOfContactNumber || ""}
              onChange={(e) =>
                handleInput("dayOfContactNumber", e.target.value)
              }
            />
          </Field>
        </div>
      </section>

      {/* 02 — EVENT DETAILS */}
      <section className="mb-12">
        <SectionHeader num="02" title="EVENT DETAILS" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Event Type" required>
            <select
              className={`${selectClass} ${fieldErrors.eventType ? "!border-red-400" : ""}`}
              style={{ backgroundImage: selectBg }}
              value={formData.eventType || ""}
              onChange={(e) => handleInput("eventType", e.target.value)}
            >
              <option value="" disabled>
                Select type
              </option>
              <option>Wedding</option>
              <option>Corporate</option>
              <option>Private Party</option>
              <option>Festival</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Event Date" required>
            <input
              type="date"
              className={`${inputClass} ${fieldErrors.eventDate ? "!border-red-400" : ""}`}
              value={formData.eventDate || ""}
              onChange={(e) => handleInput("eventDate", e.target.value)}
            />
          </Field>
          <Field label="Name(s) of Person(s) Celebrated" full>
            <input
              type="text"
              className={inputClass}
              value={formData.personCelebrated || ""}
              onChange={(e) =>
                handleInput("personCelebrated", e.target.value)
              }
            />
          </Field>
          <Field label="Event Start Time">
            <input
              type="time"
              className={inputClass}
              value={formData.eventStartTime || ""}
              onChange={(e) =>
                handleInput("eventStartTime", e.target.value)
              }
            />
          </Field>
          <Field label="Guest Arrival Time">
            <input
              type="time"
              className={inputClass}
              value={formData.guestArrivalTime || ""}
              onChange={(e) =>
                handleInput("guestArrivalTime", e.target.value)
              }
            />
          </Field>
          <Field label="Venue Curfew">
            <input
              type="time"
              className={inputClass}
              value={formData.venueCurfew || ""}
              onChange={(e) => handleInput("venueCurfew", e.target.value)}
            />
          </Field>
          <Field label="Expected Number of Guests">
            <input
              type="number"
              min="1"
              className={inputClass}
              value={formData.expectedGuests || ""}
              onChange={(e) =>
                handleInput("expectedGuests", e.target.value)
              }
            />
          </Field>
        </div>
      </section>

      {/* 03 — VENUE DETAILS */}
      <section className="mb-12">
        <SectionHeader num="03" title="VENUE DETAILS" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Venue Name" required>
            <input
              type="text"
              className={`${inputClass} ${fieldErrors.venueName ? "!border-red-400" : ""}`}
              value={formData.venueName || ""}
              onChange={(e) => handleInput("venueName", e.target.value)}
            />
          </Field>
          <Field label="Venue Address">
            <input
              type="text"
              className={inputClass}
              value={formData.venueAddress || ""}
              onChange={(e) => handleInput("venueAddress", e.target.value)}
            />
          </Field>
          <Field label="Venue Contact Name">
            <input
              type="text"
              className={inputClass}
              value={formData.venueContactName || ""}
              onChange={(e) =>
                handleInput("venueContactName", e.target.value)
              }
            />
          </Field>
          <Field label="Venue Contact Number">
            <input
              type="tel"
              className={inputClass}
              value={formData.venueContactNumber || ""}
              onChange={(e) =>
                handleInput("venueContactNumber", e.target.value)
              }
            />
          </Field>
          <Field label="Earliest Building Access Time">
            <input
              type="time"
              className={inputClass}
              value={formData.earliestAccessTime || ""}
              onChange={(e) =>
                handleInput("earliestAccessTime", e.target.value)
              }
            />
          </Field>
          <Field label="Power Supply">
            <select
              className={selectClass}
              style={{ backgroundImage: selectBg }}
              value={formData.powerSupply || ""}
              onChange={(e) => handleInput("powerSupply", e.target.value)}
            >
              <option value="" disabled>
                Select
              </option>
              <option>Standard Sockets</option>
              <option>Single Phase</option>
              <option>3 Phase</option>
              <option>Not Sure</option>
            </select>
          </Field>
          <Field label="On-site Parking Available?">
            <ToggleGroup
              field="parking"
              options={["Yes", "No", "Not Sure"]}
              value={toggles.parking || ""}
              onChange={handleToggle}
            />
          </Field>
          <Field label="Sound Limiter?">
            <ToggleGroup
              field="soundLimiter"
              options={["Yes", "No", "Not Sure"]}
              value={toggles.soundLimiter || ""}
              onChange={handleToggle}
            />
          </Field>
        </div>
      </section>

      {/* 04 — LOAD-IN & ACCESS */}
      <section className="mb-12">
        <SectionHeader num="04" title="LOAD-IN & ACCESS" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Step-free / Ground-level Access?" full>
            <ToggleGroup
              field="stepFreeAccess"
              options={["Yes", "No", "Not Sure"]}
              value={toggles.stepFreeAccess || ""}
              onChange={handleToggle}
            />
          </Field>
          <Field label="Access Restrictions" full>
            <input
              type="text"
              placeholder="Lifts, stairs, narrow corridors, etc."
              className={inputClass}
              value={formData.accessRestrictions || ""}
              onChange={(e) =>
                handleInput("accessRestrictions", e.target.value)
              }
            />
          </Field>
          <Field label="Distance from Vehicle to Performance Area">
            <input
              type="text"
              className={inputClass}
              value={formData.vehicleDistance || ""}
              onChange={(e) =>
                handleInput("vehicleDistance", e.target.value)
              }
            />
          </Field>
          <Field label="Nearest Vehicle Unloading Point">
            <input
              type="text"
              className={inputClass}
              value={formData.unloadingPoint || ""}
              onChange={(e) =>
                handleInput("unloadingPoint", e.target.value)
              }
            />
          </Field>
        </div>
      </section>

      {/* 05 — PERFORMANCE DETAILS */}
      <section className="mb-12">
        <SectionHeader num="05" title="PERFORMANCE DETAILS" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            label="Preferred Soundcheck Start Time"
            hint="We need approximately 90 minutes for soundcheck."
            full
          >
            <input
              type="time"
              className={inputClass}
              value={formData.soundcheckTime || ""}
              onChange={(e) =>
                handleInput("soundcheckTime", e.target.value)
              }
            />
          </Field>
          <Field label="Do You Require a DJ?" full>
            <ToggleGroup
              field="djRequired"
              options={["Yes", "No"]}
              value={toggles.djRequired || ""}
              onChange={handleToggle}
            />
          </Field>
        </div>

        {toggles.djRequired === "Yes" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
            <Field label="DJ Set Timings">
              <input
                type="text"
                className={inputClass}
                value={formData.djSetTimings || ""}
                onChange={(e) =>
                  handleInput("djSetTimings", e.target.value)
                }
              />
            </Field>
            <Field label="Genres for DJ to Cover">
              <input
                type="text"
                className={inputClass}
                value={formData.djGenres || ""}
                onChange={(e) => handleInput("djGenres", e.target.value)}
              />
            </Field>
          </div>
        )}

        <div className="mt-5 bg-dark-surface border-l-[3px] border-teal-dark p-4 rounded-r-lg text-[0.85rem] text-muted leading-relaxed">
          Band member numbers will be confirmed closer to the event (up to
          7). Please ensure catering, green room space, and parking can
          accommodate this.
        </div>
      </section>

      {/* 06 — GENRE PREFERENCES */}
      <section className="mb-12">
        <SectionHeader num="06" title="GENRE PREFERENCES" />
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
          {GENRES.map((genre) => (
            <GenreCard
              key={genre}
              genre={genre}
              selected={selectedGenres.includes(genre)}
              onToggle={toggleGenre}
            />
          ))}
        </div>
        <div className="mt-5">
          <Field label="Other Genres or Specific Songs" full>
            <input
              type="text"
              className={inputClass}
              value={formData.otherGenres || ""}
              onChange={(e) => handleInput("otherGenres", e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* 07 — SPECIAL REQUESTS */}
      <section className="mb-12">
        <SectionHeader num="07" title="SPECIAL REQUESTS" />
        <Field label="Anything Else We Should Know" full>
          <textarea
            placeholder="Accessibility needs, special moments, surprises, vibes — tell us everything"
            className={`${inputClass} min-h-[110px] resize-y`}
            value={formData.specialRequests || ""}
            onChange={(e) =>
              handleInput("specialRequests", e.target.value)
            }
          />
        </Field>
      </section>

      {/* Submit */}
      <div className="text-center mt-14">
        {mode === "create" && (
          <p className="text-[0.85rem] text-muted max-w-[480px] mx-auto mb-7 leading-relaxed">
            We&apos;ll review your details and send a Performance Contract for
            signing. Your booking is confirmed once the contract is signed and
            the deposit is received.
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="font-display text-[1.3rem] tracking-[0.1em] uppercase text-lme-black bg-teal-primary rounded-[10px] px-12 py-4 min-h-[56px] cursor-pointer transition-colors hover:bg-teal-glow disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto w-full"
        >
          {submitting
            ? mode === "create"
              ? "SUBMITTING..."
              : "UPDATING..."
            : mode === "create"
              ? "SUBMIT BOOKING FORM"
              : "UPDATE BOOKING"}
        </button>
        {error && (
          <p className="text-red-400 text-[0.9rem] mt-4">{error}</p>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BookingForm.tsx
git commit -m "feat: extract shared BookingForm component with create/edit modes"
```

---

### Task 8: Update Booking Form Page to Use Shared Component

**Files:**
- Modify: `src/app/bookingform/page.tsx`

- [ ] **Step 1: Rewrite the booking form page**

Replace the entire contents of `src/app/bookingform/page.tsx` with:

```tsx
// src/app/bookingform/page.tsx

"use client";

import BookingForm from "@/components/BookingForm";
import type { BookingFormData } from "@/lib/booking-types";

export default function BookingFormPage() {
  async function handleSubmit(
    data: BookingFormData
  ): Promise<{ token?: string }> {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Submission failed");

    const result = await res.json();
    return { token: result.token };
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-[680px] mx-auto px-6 pt-12 pb-16 flex-1">
        {/* Header */}
        <div className="text-center mb-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logos/lme-typo-white.png"
            alt="LME — Live Music Enhancers"
            className="h-12 mx-auto mb-6"
          />
          <h1 className="font-display text-[3.2rem] text-lme-white tracking-[0.12em] leading-none mb-2">
            BOOKING FORM
          </h1>
          <p className="font-mono text-[0.8rem] text-teal-primary tracking-[0.25em] uppercase mb-6">
            WE WANT TO PARTY.
          </p>
          <p className="text-[0.95rem] text-muted max-w-[540px] mx-auto leading-relaxed">
            Complete this form to help us prepare for your event. This is for
            information gathering only — it is not a binding contract. Once
            received, we&apos;ll send a Performance Contract for review and
            signature.
          </p>
        </div>

        <BookingForm mode="create" onSubmit={handleSubmit} />
      </div>

      <footer className="text-center py-12 font-mono text-[0.7rem] text-muted tracking-[0.1em]">
        &copy; 2026 LME &mdash; Live Music Enhancers | lmeband.com
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/khari/Documents/GitHub/LME-Website && pnpm build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/bookingform/page.tsx
git commit -m "refactor: use shared BookingForm component in create page"
```

---

### Task 9: Create Edit Booking Page

**Files:**
- Create: `src/app/bookingform/edit/[token]/page.tsx`

- [ ] **Step 1: Create the edit page**

```tsx
// src/app/bookingform/edit/[token]/page.tsx

"use client";

import { useEffect, useState, use } from "react";
import BookingForm from "@/components/BookingForm";
import type { BookingFormData } from "@/lib/booking-types";

export default function EditBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [initialData, setInitialData] = useState<BookingFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/booking/${token}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load booking");

        const result = await res.json();
        setInitialData(result.data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [token]);

  async function handleSubmit(
    data: BookingFormData
  ): Promise<{ token?: string }> {
    const res = await fetch(`/api/booking/${token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Update failed");
    return {};
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-sm text-teal-primary tracking-[0.2em] uppercase animate-pulse">
            Loading your booking...
          </p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="font-display text-[3rem] text-lme-white tracking-[0.12em] mb-4">
            BOOKING NOT FOUND
          </h2>
          <p className="text-body text-base max-w-[400px] mx-auto leading-relaxed">
            This edit link may have expired or is invalid. If you need help,
            contact us at{" "}
            <a
              href="mailto:info@lmeband.com"
              className="text-teal-primary hover:text-teal-glow transition-colors"
            >
              info@lmeband.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-[680px] mx-auto px-6 pt-12 pb-16 flex-1">
        {/* Header */}
        <div className="text-center mb-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logos/lme-typo-white.png"
            alt="LME — Live Music Enhancers"
            className="h-12 mx-auto mb-6"
          />
          <h1 className="font-display text-[3.2rem] text-lme-white tracking-[0.12em] leading-none mb-2">
            EDIT BOOKING
          </h1>
          <p className="font-mono text-[0.8rem] text-teal-primary tracking-[0.25em] uppercase mb-6">
            UPDATE YOUR DETAILS
          </p>
          <p className="text-[0.95rem] text-muted max-w-[540px] mx-auto leading-relaxed">
            Make changes to your booking details below. All fields are
            editable. Hit update when you&apos;re done.
          </p>
        </div>

        <BookingForm
          mode="edit"
          initialData={initialData || undefined}
          onSubmit={handleSubmit}
        />
      </div>

      <footer className="text-center py-12 font-mono text-[0.7rem] text-muted tracking-[0.1em]">
        &copy; 2026 LME &mdash; Live Music Enhancers | lmeband.com
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/khari/Documents/GitHub/LME-Website && pnpm build
```

Expected: Build succeeds with the new dynamic route.

- [ ] **Step 3: Commit**

```bash
git add src/app/bookingform/edit/[token]/page.tsx
git commit -m "feat: add edit booking page with magic link support"
```

---

### Task 10: Add Notion Edit Token Property

This is a manual step — the `Edit Token` property needs to exist in the Notion database before the API can write to it.

- [ ] **Step 1: Add property in Notion**

Open the LME booking database in Notion and add a new property:
- **Name:** `Edit Token`
- **Type:** `Text` (rich_text)

This is a one-time manual step.

---

### Task 11: Add Environment Variable

- [ ] **Step 1: Add RESEND_API_KEY to Vercel**

```bash
vercel env add RESEND_API_KEY
```

When prompted:
- Value: your Resend API key
- Environments: Production, Preview, Development

- [ ] **Step 2: Pull env vars locally**

```bash
vercel env pull .env.local
```

- [ ] **Step 3: Optionally add NEXT_PUBLIC_SITE_URL**

If your production URL differs from `https://www.lmeband.com`, add:

```bash
vercel env add NEXT_PUBLIC_SITE_URL
```

Value: `https://www.lmeband.com`

---

### Task 12: End-to-End Manual Verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/khari/Documents/GitHub/LME-Website && pnpm dev
```

- [ ] **Step 2: Test create flow**

1. Go to `http://localhost:3002/bookingform`
2. Fill in required fields (name, email, phone, event type, date, venue)
3. Submit the form
4. Verify the success screen shows with the magic link and copy button
5. Check Notion — new page should have an `Edit Token` property filled in
6. Check your email — confirmation should arrive from `info@lmeband.com` with booking details and the edit link

- [ ] **Step 3: Test edit flow**

1. Click the magic link from the success screen (or from the email)
2. Verify the form loads pre-filled with your submitted data
3. Change a few fields (e.g. venue name, add genres, change date)
4. Click "UPDATE BOOKING"
5. Verify the success screen shows "BOOKING UPDATED"
6. Check Notion — the page should reflect the updated values

- [ ] **Step 4: Test error cases**

1. Visit `/bookingform/edit/fake-token-12345` — should show "BOOKING NOT FOUND"
2. Submit the edit form with a required field cleared — should show validation error

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete magic link booking system (Phase 1)"
git push origin main
```
