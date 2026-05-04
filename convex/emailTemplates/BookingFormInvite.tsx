import * as React from "react";
import { BrandLayout, brand } from "./BrandLayout";

export function BookingFormInviteEmail({
  firstName,
  portalUrl,
}: {
  firstName: string;
  portalUrl: string;
}) {
  return (
    <BrandLayout preview="Your LME booking — next step">
      <brand.Heading>Hi {firstName} — next step</brand.Heading>
      <brand.Body>
        Thanks for your initial enquiry. We'd love to get a few more details so
        we can put a tailored proposal together for you.
      </brand.Body>
      <brand.Body>It takes about 3 minutes:</brand.Body>
      <brand.Cta href={portalUrl}>Continue your booking</brand.Cta>
      <brand.Small>The link is private — keep it to yourself. — LME</brand.Small>
    </BrandLayout>
  );
}
