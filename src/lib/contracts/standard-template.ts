// ---------------------------------------------------------------------------
// standard-template — pure renderer for the LME standard performance contract.
//
// The contract HTML is produced server-side from typed `ContractData` and
// rendered into the client portal via `dangerouslySetInnerHTML`. To keep that
// safe, every interpolated string is escaped through the local `escape()`
// helper. Keep this file dependency-free so it can be imported from both the
// Convex query (`convex/contracts.getContractData`) and any future PDF/email
// renderer without dragging in framework code.
//
// Style is intentionally inline (no Tailwind, no CSS modules) so the contract
// renders identically inside the dark client portal layout AND when copied to
// PDF or print previews — no external stylesheet needed.
// ---------------------------------------------------------------------------

export type ContractData = {
  clientName: string;
  clientAddress?: string;
  // Already-formatted date strings — caller decides locale + format so this
  // module stays pure and easy to unit-test.
  eventDate: string;
  venue: string;
  fee: number;
  depositAmount: number;
  balanceDueDate: string;
  bandConfig: string;
  extras: string[];
  generatedAt: string;
};

export function renderStandardContract(d: ContractData): string {
  const extrasLine = d.extras.length > 0 ? d.extras.join(", ") : "None";
  return `
<article class="contract" style="font-family:Georgia,serif;color:#0a0a0a;line-height:1.6;max-width:780px;margin:0 auto;padding:32px;background:#fff;border:1px solid #ddd">
  <header style="text-align:center;border-bottom:2px solid #0a0a0a;padding-bottom:16px;margin-bottom:24px">
    <h1 style="margin:0;font-size:28px;letter-spacing:0.05em">LME PERFORMANCE CONTRACT</h1>
    <p style="margin:4px 0 0;color:#555;font-size:13px">Live Music Enhancers Limited · admin@lmeband.com</p>
  </header>

  <p>This contract is between <strong>Live Music Enhancers Limited</strong> ("LME") and <strong>${escape(d.clientName)}</strong>${d.clientAddress ? ` of ${escape(d.clientAddress)}` : ""} ("the Client") for the performance described below.</p>

  <h2 style="margin-top:24px;font-size:16px;text-transform:uppercase;letter-spacing:0.08em">Engagement</h2>
  <table style="width:100%;border-collapse:collapse;margin-top:8px">
    <tr><td style="padding:6px;border-bottom:1px solid #eee;width:40%"><strong>Event date</strong></td><td style="padding:6px;border-bottom:1px solid #eee">${escape(d.eventDate)}</td></tr>
    <tr><td style="padding:6px;border-bottom:1px solid #eee"><strong>Venue</strong></td><td style="padding:6px;border-bottom:1px solid #eee">${escape(d.venue)}</td></tr>
    <tr><td style="padding:6px;border-bottom:1px solid #eee"><strong>Band configuration</strong></td><td style="padding:6px;border-bottom:1px solid #eee">${escape(d.bandConfig)}</td></tr>
    <tr><td style="padding:6px;border-bottom:1px solid #eee"><strong>Extras</strong></td><td style="padding:6px;border-bottom:1px solid #eee">${escape(extrasLine)}</td></tr>
  </table>

  <h2 style="margin-top:24px;font-size:16px;text-transform:uppercase;letter-spacing:0.08em">Fee &amp; payment</h2>
  <ul>
    <li>Total fee: <strong>£${d.fee.toFixed(2)}</strong></li>
    <li>Non-refundable deposit due on signing: <strong>£${d.depositAmount.toFixed(2)}</strong></li>
    <li>Balance of <strong>£${(d.fee - d.depositAmount).toFixed(2)}</strong> due by <strong>${escape(d.balanceDueDate)}</strong></li>
  </ul>

  <h2 style="margin-top:24px;font-size:16px;text-transform:uppercase;letter-spacing:0.08em">Terms</h2>
  <ol>
    <li><strong>Cancellation by Client:</strong> The deposit is non-refundable. If the Client cancels within 30 days of the event date, the full fee remains payable.</li>
    <li><strong>Cancellation by LME:</strong> If LME cancels for any reason other than force majeure, all monies paid will be refunded in full.</li>
    <li><strong>Performance:</strong> LME will perform up to two 60-minute sets unless otherwise agreed in writing. Set timings will be confirmed in the pre-event survey.</li>
    <li><strong>Equipment &amp; access:</strong> The Client will ensure suitable performance space, power supply, and load-in access. Specific requirements are confirmed in the pre-event survey.</li>
    <li><strong>Force majeure:</strong> Neither party is liable for failure to perform due to events beyond reasonable control (illness, severe weather, government restrictions, venue closure).</li>
    <li><strong>Recording &amp; promotion:</strong> LME may record audio/video at the event for promotional use unless the Client explicitly opts out before the event.</li>
    <li><strong>Governing law:</strong> This contract is governed by the laws of England and Wales.</li>
  </ol>

  <p style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#777">Generated ${escape(d.generatedAt)}</p>
</article>
`;
}

// HTML-escape every interpolation. Critical for safety because the rendered
// string is injected into the DOM via `dangerouslySetInnerHTML`. Do NOT skip
// this — the client name (and other fields) ultimately come from user input.
function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
