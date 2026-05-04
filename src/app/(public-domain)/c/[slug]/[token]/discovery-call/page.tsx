import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { DiscoveryCallClient } from "@/components/client-portal/DiscoveryCallClient";

// Server component — verifies the magic-link token via
// `getDiscoveryCallData` (which folds the token check + event read + slots
// read into one round-trip) and hands off to the client picker. Mirrors the
// pre-event survey page pattern at `../pre-event/page.tsx`.
//
// One-deeper relative-import depth: 7 `../` for convex/_generated.
export default async function DiscoveryCallPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { token } = await params;
  const data = await fetchQuery(api.discoveryCall.getDiscoveryCallData, {
    token,
  });

  if (!data) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">This link is no longer valid</h1>
        <p className="text-sm text-[#8A8A8A]">
          Please contact{" "}
          <a href="mailto:admin@lmeband.com" className="underline">
            admin@lmeband.com
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <DiscoveryCallClient
      token={token}
      eventName={data.eventName}
      clientName={data.clientName}
      proposedSlots={data.proposedSlots}
      pickedSlot={data.pickedSlot ?? null}
      cancelled={data.cancelled}
    />
  );
}
