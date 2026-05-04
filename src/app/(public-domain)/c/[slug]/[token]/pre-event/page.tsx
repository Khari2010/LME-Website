import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { PreEventSurveyClient } from "@/components/client-portal/PreEventSurveyClient";

// Server component — verifies the magic-link token via `getSurveyData`
// (which folds the token check + event read into one round-trip) and hands
// off to the client form. Mirrors the booking-form page pattern at
// `../booking-form/page.tsx`.
//
// One-deeper relative-import depth: 7 `../` for convex/_generated.
export default async function PreEventSurveyPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { token } = await params;
  const data = await fetchQuery(api.preEventSurvey.getSurveyData, { token });

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
    <PreEventSurveyClient
      token={token}
      eventName={data.eventName}
      eventDate={data.eventDate}
      venue={data.venue ?? null}
      clientName={data.clientName}
      alreadySubmitted={Boolean(data.submittedAt)}
    />
  );
}
