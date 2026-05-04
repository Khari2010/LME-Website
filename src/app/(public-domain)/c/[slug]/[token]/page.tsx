import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { ClientPortalView } from "@/components/client-portal/ClientPortalView";

// Server component — fetches and verifies the magic-link token via Convex.
// `slug` is presentational (e.g. "bria-mardenborough") and is NOT validated;
// the `token` is the only thing that authenticates this view.
//
// On invalid/expired/revoked tokens we render a static "no longer valid"
// message — we do NOT redirect to /admin/sign-in (this is a public surface).
export default async function ClientPortalPage({
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
            ? "It expired. Please contact the LME team for a fresh link."
            : result.reason === "revoked"
              ? "It's been revoked. Please contact the LME team if you need access."
              : "It doesn't match a booking. Check the link in your email."}
        </p>
      </div>
    );
  }

  // verifyToken returns { valid: true, eventId } when valid.
  const eventId = result.eventId as Id<"events">;
  const event = await fetchQuery(api.events.getById, { id: eventId });
  if (!event) {
    return <div className="text-2xl font-bold">Booking not found.</div>;
  }

  // Hand off to client component for live updates via useQuery — admins
  // patching the event (e.g. marking the contract sent) are reflected
  // immediately in the client's open tab.
  return <ClientPortalView eventId={eventId} />;
}
