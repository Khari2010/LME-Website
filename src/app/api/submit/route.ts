import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { NOTION_API_KEY, NOTION_DATABASE_ID } = process.env;

  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const data = await req.json();

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

    const children = buildPageBody(data);

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DATABASE_ID },
        properties,
        children,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Notion API error:", JSON.stringify(err));
      return NextResponse.json(
        { error: "Failed to submit to Notion" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface FormData {
  clientName?: string;
  email?: string;
  contactNumber?: string;
  clientAddress?: string;
  dayOfContactName?: string;
  dayOfContactNumber?: string;
  eventType?: string;
  eventDate?: string;
  personCelebrated?: string;
  eventStartTime?: string;
  guestArrivalTime?: string;
  venueCurfew?: string;
  expectedGuests?: string;
  venueName?: string;
  venueAddress?: string;
  venueContactName?: string;
  venueContactNumber?: string;
  earliestAccessTime?: string;
  powerSupply?: string;
  parking?: string;
  soundLimiter?: string;
  stepFreeAccess?: string;
  accessRestrictions?: string;
  vehicleDistance?: string;
  unloadingPoint?: string;
  soundcheckTime?: string;
  djRequired?: string;
  djSetTimings?: string;
  djGenres?: string;
  genres?: string[];
  otherGenres?: string;
  specialRequests?: string;
}

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

function buildPageBody(d: FormData) {
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
  blocks.push(
    paragraph("Earliest Building Access Time", d.earliestAccessTime)
  );
  blocks.push(paragraph("Power Supply", d.powerSupply));
  blocks.push(paragraph("On-site Parking", d.parking));
  blocks.push(paragraph("Sound Limiter", d.soundLimiter));
  blocks.push(divider());

  blocks.push(heading("Load-in & Access"));
  blocks.push(
    paragraph("Step-free / Ground-level Access", d.stepFreeAccess)
  );
  blocks.push(paragraph("Access Restrictions", d.accessRestrictions));
  blocks.push(
    paragraph("Distance from Vehicle to Performance Area", d.vehicleDistance)
  );
  blocks.push(
    paragraph("Nearest Vehicle Unloading Point", d.unloadingPoint)
  );
  blocks.push(divider());

  blocks.push(heading("Performance Details"));
  blocks.push(
    paragraph("Preferred Soundcheck Start Time", d.soundcheckTime)
  );
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
