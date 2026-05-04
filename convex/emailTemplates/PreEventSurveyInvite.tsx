import * as React from "react";
import { BrandLayout, brand } from "./BrandLayout";

export function PreEventSurveyInviteEmail({
  firstName,
  portalUrl,
}: {
  firstName: string;
  portalUrl: string;
}) {
  return (
    <BrandLayout preview="Last few details for your LME booking">
      <brand.Heading>Last few details</brand.Heading>
      <brand.Body>
        Hi {firstName}, your event is coming up soon — we want to make sure it
        goes exactly how you want it.
      </brand.Body>
      <brand.Body>
        Could you take a couple of minutes to fill in the final details? Genres
        you love, must-play tracks, do-not-plays, and your day-of contact info.
      </brand.Body>
      <brand.Cta href={portalUrl}>Complete pre-event details</brand.Cta>
      <brand.Small>Looking forward to it. — The LME team</brand.Small>
    </BrandLayout>
  );
}
