import * as React from "react";
import { BrandLayout, brand } from "./BrandLayout";

export function DiscoveryCallInviteEmail({
  firstName,
  portalUrl,
}: {
  firstName: string;
  portalUrl: string;
}) {
  return (
    <BrandLayout preview="Pick a time for our discovery call">
      <brand.Heading>Pick a time</brand.Heading>
      <brand.Body>
        Hi {firstName}, thanks for sending through your booking details. The
        next step is a quick 15-minute call so we can confirm everything and
        put a tailored proposal together.
      </brand.Body>
      <brand.Cta href={portalUrl}>Choose a time</brand.Cta>
      <brand.Small>Speak soon. — LME</brand.Small>
    </BrandLayout>
  );
}
