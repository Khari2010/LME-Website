import { Resend } from "resend";
import BookingConfirmation from "@/emails/BookingConfirmation";

const getResend = () => new Resend(process.env.RESEND_API_KEY);
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.lmeband.com";

interface SendBookingConfirmationParams {
  to: string;
  clientName: string;
  eventType: string;
  eventDate: string;
  venueName: string;
  token: string;
}

export async function sendBookingConfirmation(
  params: SendBookingConfirmationParams
): Promise<void> {
  const { to, clientName, eventType, eventDate, venueName, token } = params;
  const editUrl = `${BASE_URL}/bookingform/edit/${token}`;

  const { error } = await getResend().emails.send({
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
    console.error("[email] Failed to send booking confirmation:", error);
    throw new Error(`Failed to send booking confirmation: ${error.message}`);
  }
}
