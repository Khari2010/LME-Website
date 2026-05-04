# Email templates

Branded React Email templates for all LME transactional emails. Each template
wraps the shared `BrandLayout` (dark surface, teal accent, footer block) and
exports a single component consumed by the matching Convex Node action.

## Templates

| Template | Used by | Trigger |
|---|---|---|
| `BrandLayout.tsx` | All templates | shared wrapper + `brand.*` primitives |
| `InquiryConfirmation.tsx` | `convex/publicInquiryEmail.ts` | client submits the public inquiry form |
| `BookingFormInvite.tsx` | `convex/bookingFormEmail.ts` | admin sends full booking form magic link |
| `ContractReady.tsx` | `convex/contractsEmail.ts` | admin sends contract |
| `DiscoveryCallInvite.tsx` | `convex/discoveryCallEmail.ts` | admin proposes call slots |
| `PreEventSurveyInvite.tsx` | `convex/preEventSurveyEmail.ts` | admin sends pre-event survey |
| `BalanceReminder.tsx` | `convex/remindersAction.ts` | daily cron, balance due in 14 / 7 / 1 days |

## Preview locally

```bash
pnpm dlx react-email dev --dir convex/emailTemplates
```

That spins up a localhost server showing each template with sample props. The
preview server reads each `.tsx` file, instantiates the default export with
its prop types, and renders the HTML you'd see in a real email client.

## How rendering works

Each Convex Node action calls `render(<EmailTemplate {...args} />)` from
`@react-email/components`, which returns a `Promise<string>` of HTML. Both
HTML and a plain-text fallback are passed to Resend for better deliverability:

```ts
import { render } from "@react-email/components";
import { ContractReadyEmail } from "./emailTemplates/ContractReady";

const html = await render(ContractReadyEmail({ firstName, portalUrl }));
const text = await render(ContractReadyEmail({ firstName, portalUrl }), {
  plainText: true,
});

await resend.emails.send({ from, to, subject, html, text });
```

JSX auto-escapes user-supplied strings (e.g. `firstName`), so the historical
`escapeHtml` helpers have been removed from each action file.
