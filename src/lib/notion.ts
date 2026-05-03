import { BookingFormData } from "./booking-types";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// 1. buildProperties
// ---------------------------------------------------------------------------
export function buildProperties(
  data: BookingFormData,
  token?: string
): Record<string, unknown> {
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

// ---------------------------------------------------------------------------
// Block helpers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 2. buildPageBody
// ---------------------------------------------------------------------------
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
  blocks.push(
    paragraph("Distance from Vehicle to Performance Area", d.vehicleDistance)
  );
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

// ---------------------------------------------------------------------------
// 3. createBooking
// ---------------------------------------------------------------------------
export async function createBooking(
  data: BookingFormData,
  token: string
): Promise<{ id: string }> {
  const { NOTION_DATABASE_ID } = process.env;
  if (!NOTION_DATABASE_ID) {
    throw new Error("NOTION_DATABASE_ID is not configured");
  }

  const properties = buildProperties(data, token);
  const children = buildPageBody(data);

  const response = await fetch(`${NOTION_API_BASE}/pages`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: NOTION_DATABASE_ID },
      properties,
      children,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error("Notion createBooking error:", JSON.stringify(err));
    throw new Error("Failed to create booking in Notion");
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// 4. getBookingByToken
// ---------------------------------------------------------------------------
export async function getBookingByToken(
  token: string
): Promise<Record<string, unknown> | null> {
  const { NOTION_DATABASE_ID } = process.env;
  if (!NOTION_DATABASE_ID) {
    throw new Error("NOTION_DATABASE_ID is not configured");
  }

  const response = await fetch(`${NOTION_API_BASE}/databases/${NOTION_DATABASE_ID}/query`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: {
        property: "Edit Token",
        rich_text: { equals: token },
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error("Notion getBookingByToken error:", JSON.stringify(err));
    throw new Error("Failed to query Notion database");
  }

  const result = await response.json();
  const pages = result.results as Record<string, unknown>[];
  return pages.length > 0 ? pages[0] : null;
}

// ---------------------------------------------------------------------------
// 5. parseNotionPage
// ---------------------------------------------------------------------------
export function parseNotionPage(
  page: Record<string, unknown>
): Partial<BookingFormData> {
  const props = page.properties as Record<string, Record<string, unknown>>;

  function getText(prop: Record<string, unknown> | undefined): string {
    if (!prop) return "";
    const arr = prop.rich_text as Array<{ plain_text: string }> | undefined;
    return arr?.map((t) => t.plain_text).join("") ?? "";
  }

  function getTitle(prop: Record<string, unknown> | undefined): string {
    if (!prop) return "";
    const arr = prop.title as Array<{ plain_text: string }> | undefined;
    return arr?.map((t) => t.plain_text).join("") ?? "";
  }

  function getSelect(prop: Record<string, unknown> | undefined): string {
    if (!prop) return "";
    const sel = prop.select as { name: string } | null | undefined;
    return sel?.name ?? "";
  }

  function getMultiSelect(prop: Record<string, unknown> | undefined): string[] {
    if (!prop) return [];
    const arr = prop.multi_select as Array<{ name: string }> | undefined;
    return arr?.map((s) => s.name) ?? [];
  }

  function getEmail(prop: Record<string, unknown> | undefined): string {
    if (!prop) return "";
    return (prop.email as string | null) ?? "";
  }

  function getPhone(prop: Record<string, unknown> | undefined): string {
    if (!prop) return "";
    return (prop.phone_number as string | null) ?? "";
  }

  function getNumber(prop: Record<string, unknown> | undefined): string {
    if (!prop) return "";
    const n = prop.number as number | null | undefined;
    return n != null ? String(n) : "";
  }

  function getDate(prop: Record<string, unknown> | undefined): string {
    if (!prop) return "";
    const d = prop.date as { start: string } | null | undefined;
    return d?.start ?? "";
  }

  // Extract title to parse clientName/eventType if needed, but prefer
  // the dedicated properties.
  const clientName = getText(props["Client Name "]);
  const email = getEmail(props["Client Email"]);
  const contactNumber = getPhone(props["Client Phone"]);
  const venueName = getText(props["Venue"]);
  const expectedGuests = getNumber(props["Expected Guests"]);
  const genres = getMultiSelect(props["Genres"]);
  const djRequired =
    (props["DJ Required "]?.checkbox as boolean | undefined)
      ? "Yes"
      : "No";
  const eventType = getSelect(props["Event Type"]);
  const eventDate = getDate(props["Event Date"]);

  // Fallback: parse clientName from title if property is empty
  let resolvedClientName = clientName;
  if (!resolvedClientName) {
    const title = getTitle(props["Booking "]);
    const match = title.match(/^(.+?)\s+—/);
    if (match) resolvedClientName = match[1];
  }

  return {
    clientName: resolvedClientName,
    email,
    contactNumber,
    venueName,
    expectedGuests: expectedGuests || undefined,
    genres,
    djRequired,
    eventType,
    eventDate,
  };
}

// ---------------------------------------------------------------------------
// 6. getPageBody
// ---------------------------------------------------------------------------
export async function getPageBody(
  pageId: string
): Promise<Record<string, string>> {
  const response = await fetch(
    `${NOTION_API_BASE}/blocks/${pageId}/children?page_size=100`,
    {
      method: "GET",
      headers: notionHeaders(),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    console.error("Notion getPageBody error:", JSON.stringify(err));
    throw new Error("Failed to fetch page body from Notion");
  }

  const result = await response.json();
  const blocks = result.results as Array<Record<string, unknown>>;

  const keyValuePairs: Record<string, string> = {};

  for (const block of blocks) {
    if (block.type !== "paragraph") continue;
    const para = block.paragraph as {
      rich_text: Array<{ plain_text: string }>;
    };
    if (!para?.rich_text?.length) continue;

    // Reconstruct the full text of the paragraph
    const fullText = para.rich_text.map((t) => t.plain_text).join("");

    // Match "Label: Value" pattern
    const colonIdx = fullText.indexOf(": ");
    if (colonIdx === -1) continue;

    const label = fullText.slice(0, colonIdx).trim();
    const value = fullText.slice(colonIdx + 2).trim();

    if (label && value && value !== "—") {
      keyValuePairs[label] = value;
    }
  }

  return keyValuePairs;
}

// ---------------------------------------------------------------------------
// 7. mergeBodyData
// ---------------------------------------------------------------------------
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
  formData: Partial<BookingFormData>,
  bodyData: Record<string, string>
): Partial<BookingFormData> {
  const merged: Partial<BookingFormData> = { ...formData };

  for (const [label, value] of Object.entries(bodyData)) {
    const field = BODY_LABEL_TO_FIELD[label];
    if (!field) continue;

    if (field === "genres") {
      (merged as Record<string, unknown>)[field] = value
        .split(", ")
        .filter(Boolean);
    } else {
      (merged as Record<string, unknown>)[field] = value;
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// 8. listBookings — used by scripts/migrate-bookings.ts
// ---------------------------------------------------------------------------

/**
 * Migration-ready shape for a single Notion BOOKINGS row. Field names match
 * the `notion` arg of `convex/migrations/bookingsToEvents.ts:importOne`.
 */
export interface NotionBookingRow {
  bookingName: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  eventType?: string;
  eventDate?: number; // epoch ms
  venue?: string;
  expectedGuests?: number;
  genres: string[];
  djRequired: boolean;
  status?: string;
  fee?: number;
  depositPaid: boolean;
  notes?: string;
}

function getRichText(prop: Record<string, unknown> | undefined): string {
  if (!prop) return "";
  const arr = prop.rich_text as Array<{ plain_text: string }> | undefined;
  return arr?.map((t) => t.plain_text).join("") ?? "";
}

function getTitleText(prop: Record<string, unknown> | undefined): string {
  if (!prop) return "";
  const arr = prop.title as Array<{ plain_text: string }> | undefined;
  return arr?.map((t) => t.plain_text).join("") ?? "";
}

function getSelectName(prop: Record<string, unknown> | undefined): string {
  if (!prop) return "";
  const sel = prop.select as { name: string } | null | undefined;
  return sel?.name ?? "";
}

function getMultiSelectNames(
  prop: Record<string, unknown> | undefined,
): string[] {
  if (!prop) return [];
  const arr = prop.multi_select as Array<{ name: string }> | undefined;
  return arr?.map((s) => s.name) ?? [];
}

function getEmailValue(prop: Record<string, unknown> | undefined): string {
  if (!prop) return "";
  return (prop.email as string | null) ?? "";
}

function getPhoneValue(prop: Record<string, unknown> | undefined): string {
  if (!prop) return "";
  return (prop.phone_number as string | null) ?? "";
}

function getNumberValue(
  prop: Record<string, unknown> | undefined,
): number | undefined {
  if (!prop) return undefined;
  const n = prop.number as number | null | undefined;
  return n != null ? n : undefined;
}

function getCheckboxValue(prop: Record<string, unknown> | undefined): boolean {
  if (!prop) return false;
  return (prop.checkbox as boolean | undefined) ?? false;
}

function getDateMs(
  prop: Record<string, unknown> | undefined,
): number | undefined {
  if (!prop) return undefined;
  const d = prop.date as { start: string } | null | undefined;
  if (!d?.start) return undefined;
  const ms = Date.parse(d.start);
  return Number.isFinite(ms) ? ms : undefined;
}

/**
 * Fetch every page from the Notion BOOKINGS database, paging through
 * Notion's 100-per-page limit, and return the rows mapped onto the
 * migration-ready `NotionBookingRow` shape. Used once at deploy time by
 * `scripts/migrate-bookings.ts` — not used by any runtime app code.
 */
export async function listBookings(): Promise<NotionBookingRow[]> {
  const { NOTION_DATABASE_ID } = process.env;
  if (!NOTION_DATABASE_ID) {
    throw new Error("NOTION_DATABASE_ID is not configured");
  }

  const out: NotionBookingRow[] = [];
  let cursor: string | undefined = undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const response = await fetch(
      `${NOTION_API_BASE}/databases/${NOTION_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: notionHeaders(),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const err = await response.json();
      console.error("Notion listBookings error:", JSON.stringify(err));
      throw new Error("Failed to list bookings from Notion");
    }

    const result = (await response.json()) as {
      results: Array<Record<string, unknown>>;
      has_more: boolean;
      next_cursor: string | null;
    };

    for (const page of result.results) {
      const props = page.properties as Record<
        string,
        Record<string, unknown>
      >;

      const bookingName =
        getTitleText(props["Booking "]) || getTitleText(props["Booking"]);
      const clientName = getRichText(props["Client Name "]);
      const clientEmail = getEmailValue(props["Client Email"]);
      const clientPhone = getPhoneValue(props["Client Phone"]);
      const eventType = getSelectName(props["Event Type"]);
      const eventDate = getDateMs(props["Event Date"]);
      const venue = getRichText(props["Venue"]);
      const expectedGuests = getNumberValue(props["Expected Guests"]);
      const genres = getMultiSelectNames(props["Genres"]);
      const djRequired = getCheckboxValue(props["DJ Required "]);
      const status = getSelectName(props["Status"]);
      // Notion BOOKINGS may or may not have these — they're optional.
      const fee =
        getNumberValue(props["Fee"]) ?? getNumberValue(props["Total Fee"]);
      const depositPaid =
        getCheckboxValue(props["Deposit Paid"]) ||
        getCheckboxValue(props["Deposit Paid "]);
      const notes =
        getRichText(props["Notes"]) || getRichText(props["Special Requests"]);

      out.push({
        bookingName: bookingName || "Untitled booking",
        clientName: clientName || undefined,
        clientEmail: clientEmail || undefined,
        clientPhone: clientPhone || undefined,
        eventType: eventType || undefined,
        eventDate,
        venue: venue || undefined,
        expectedGuests,
        genres,
        djRequired,
        status: status || undefined,
        fee,
        depositPaid,
        notes: notes || undefined,
      });
    }

    cursor = result.has_more ? result.next_cursor ?? undefined : undefined;
  } while (cursor);

  return out;
}

// ---------------------------------------------------------------------------
// 9. updateBooking
// ---------------------------------------------------------------------------
export async function updateBooking(
  pageId: string,
  data: BookingFormData
): Promise<void> {
  // Build properties but exclude Status and Edit Token
  const allProperties = buildProperties(data);
  const { Status: _status, "Edit Token": _token, ...updateProps } = allProperties;

  // PATCH page properties
  const patchResponse = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
    method: "PATCH",
    headers: notionHeaders(),
    body: JSON.stringify({ properties: updateProps }),
  });

  if (!patchResponse.ok) {
    const err = await patchResponse.json();
    console.error("Notion updateBooking PATCH error:", JSON.stringify(err));
    throw new Error("Failed to update booking properties in Notion");
  }

  // Delete all existing body blocks
  const listResponse = await fetch(
    `${NOTION_API_BASE}/blocks/${pageId}/children?page_size=100`,
    {
      method: "GET",
      headers: notionHeaders(),
    }
  );

  if (!listResponse.ok) {
    const err = await listResponse.json();
    console.error("Notion updateBooking list blocks error:", JSON.stringify(err));
    throw new Error("Failed to list existing blocks for deletion");
  }

  const listResult = await listResponse.json();
  const existingBlocks = listResult.results as Array<{ id: string }>;

  // Delete each block individually
  await Promise.all(
    existingBlocks.map((block) =>
      fetch(`${NOTION_API_BASE}/blocks/${block.id}`, {
        method: "DELETE",
        headers: notionHeaders(),
      })
    )
  );

  // Rebuild body blocks — Notion limits 100 blocks per append request
  const newBlocks = buildPageBody(data);
  const CHUNK_SIZE = 100;

  for (let i = 0; i < newBlocks.length; i += CHUNK_SIZE) {
    const chunk = newBlocks.slice(i, i + CHUNK_SIZE);
    const appendResponse = await fetch(
      `${NOTION_API_BASE}/blocks/${pageId}/children`,
      {
        method: "PATCH",
        headers: notionHeaders(),
        body: JSON.stringify({ children: chunk }),
      }
    );

    if (!appendResponse.ok) {
      const err = await appendResponse.json();
      console.error("Notion updateBooking append error:", JSON.stringify(err));
      throw new Error("Failed to append new blocks to Notion page");
    }
  }
}
