import * as React from "react";
import { BrandLayout, brand } from "./BrandLayout";

export function InquiryConfirmationEmail({ firstName }: { firstName: string }) {
  return (
    <BrandLayout preview="Thanks for your enquiry — we'll be in touch within 48 hours">
      <brand.Heading>Thanks for getting in touch</brand.Heading>
      <brand.Body>
        Hi {firstName}, thanks for reaching out about a booking. We'll be in
        touch within 48 hours to discuss the details.
      </brand.Body>
      <brand.Body>
        In the meantime, you can{" "}
        <a
          href="https://lmeband.com"
          style={{ color: brand.colors.accent }}
        >
          have a look at what we do
        </a>{" "}
        or{" "}
        <a
          href="https://soundcloud.com/lme-band"
          style={{ color: brand.colors.accent }}
        >
          hear our latest mixes
        </a>
        .
      </brand.Body>
      <brand.Small>— The LME team</brand.Small>
    </BrandLayout>
  );
}
