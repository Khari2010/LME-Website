import * as React from "react";
import { BrandLayout, brand } from "./BrandLayout";

export function ContractReadyEmail({
  firstName,
  portalUrl,
}: {
  firstName: string;
  portalUrl: string;
}) {
  return (
    <BrandLayout preview="Your LME contract is ready to sign">
      <brand.Heading>Your contract is ready</brand.Heading>
      <brand.Body>
        Hi {firstName}, your performance contract is ready. Please review and
        sign it via the link below — it should take about a minute.
      </brand.Body>
      <brand.Cta href={portalUrl}>Review &amp; sign</brand.Cta>
      <brand.Body>
        Once signed, we'll send through the deposit invoice to lock in your
        date.
      </brand.Body>
      <brand.Small>— The LME team</brand.Small>
    </BrandLayout>
  );
}
