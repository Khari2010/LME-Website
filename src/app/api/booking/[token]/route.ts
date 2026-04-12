import { NextRequest, NextResponse } from "next/server";
import {
  getBookingByToken,
  parseNotionPage,
  getPageBody,
  mergeBodyData,
  updateBooking,
} from "@/lib/notion";
import { BookingFormData } from "@/lib/booking-types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const page = await getBookingByToken(token);
  if (!page) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const formData = parseNotionPage(page);
  const bodyData = await getPageBody(page.id as string);
  const merged = mergeBodyData(formData, bodyData);

  return NextResponse.json({ data: merged });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const page = await getBookingByToken(token);
  if (!page) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const data = (await req.json()) as BookingFormData;

  await updateBooking(page.id as string, data);

  return NextResponse.json({ success: true });
}
