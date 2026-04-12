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
