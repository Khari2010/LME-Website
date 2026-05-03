import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { BookingFormClient } from "@/components/client-portal/BookingFormClient";

// Server component — verifies the magic-link token, fetches the event, and
// hands off to the client form. Mirrors the verification pattern in the
// portal page one level up (`../page.tsx`); see B2 for the rationale.
//
// One-deeper relative-import depth: 7 `../` (vs 6 `../` in the parent page).
export default async function BookingFormPortalPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { token } = await params;
  const result = await fetchQuery(api.bookingTokens.verifyToken, { token });

  if (!result.valid) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">This link is no longer valid</h1>
        <p className="text-sm text-[#8A8A8A]">
          {result.reason === "expired"
            ? "It expired."
            : result.reason === "revoked"
              ? "It's been revoked."
              : "It doesn't match a booking."}{" "}
          Please contact{" "}
          <a href="mailto:admin@lmeband.com" className="underline">
            admin@lmeband.com
          </a>
          .
        </p>
      </div>
    );
  }

  const eventId = result.eventId as Id<"events">;
  const event = await fetchQuery(api.events.getById, { id: eventId });
  if (!event) {
    return <h1 className="text-2xl font-bold">Booking not found.</h1>;
  }

  return <BookingFormClient eventId={eventId} token={token} />;
}
