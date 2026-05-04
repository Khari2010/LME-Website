import * as React from "react";
import { BrandLayout, brand } from "./BrandLayout";

export function BalanceReminderEmail({
  firstName,
  amount,
  dueDateLabel,
  urgency,
}: {
  firstName: string;
  /** Pre-formatted display string e.g. "£1,250.00". */
  amount: string;
  /** Pre-formatted display string e.g. "11 July 2026". */
  dueDateLabel: string;
  urgency: "two-weeks" | "one-week" | "tomorrow";
}) {
  const urgencyText =
    urgency === "tomorrow"
      ? "tomorrow"
      : urgency === "one-week"
        ? "in a week"
        : "in two weeks";

  return (
    <BrandLayout preview={`Friendly reminder: balance due ${urgencyText}`}>
      <brand.Heading>Friendly reminder</brand.Heading>
      <brand.Body>
        Hi {firstName}, just a heads up — the remaining balance of{" "}
        <strong style={{ color: brand.colors.text }}>{amount}</strong> for your
        LME booking is due on{" "}
        <strong style={{ color: brand.colors.text }}>{dueDateLabel}</strong>.
      </brand.Body>
      <brand.Body>
        If you've already paid, ignore this message — payments can take a day
        or two to reflect.
      </brand.Body>
      <brand.Body>Any questions? Reply to this email.</brand.Body>
      <brand.Small>— The LME team</brand.Small>
    </BrandLayout>
  );
}
