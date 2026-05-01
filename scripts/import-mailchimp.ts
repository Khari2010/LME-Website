/**
 * One-shot import of MailChimp CSV export into Convex contacts table.
 *
 * Usage:
 *   pnpm dlx tsx scripts/import-mailchimp.ts
 *
 * Reads the CSV at the path below, parses each row, and calls
 * api.contacts.bulkUpsertContacts in a single batch.
 */

import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { ConvexHttpClient } from "convex/browser";
import { config as loadEnv } from "dotenv";
import { api } from "../convex/_generated/api";

// Load .env.local explicitly so NEXT_PUBLIC_CONVEX_URL is available.
loadEnv({ path: ".env.local" });

const CSV_PATH =
  "/Users/khari/Dropbox (Personal)/LME - Live Music Enhancers/Ai things/Mailchimp app/audience_export_9f20758f86/subscribed_email_audience_export_9f20758f86.csv";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error(
    "NEXT_PUBLIC_CONVEX_URL not set — make sure .env.local has the dev deployment URL.",
  );
  process.exit(1);
}

type CsvRow = Record<string, string>;

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  // MailChimp wraps each tag in double-quotes and joins with commas:
  //   "Tag One","Tag Two","Tag Three"
  // csv-parse already strips the outer quotes for the field, so the value we get
  // is something like:  "Tag One","Tag Two"
  // i.e. tags are still wrapped in their own escaped quotes.
  // We'll match anything between double-quotes.
  const out: string[] = [];
  const re = /"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const t = m[1].trim();
    if (t) out.push(t);
  }
  if (out.length === 0) {
    // Fallback: split on commas
    raw
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter(Boolean)
      .forEach((t) => out.push(t));
  }
  return out;
}

function buildName(first: string, last: string): string | undefined {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  const combined = [f, l].filter(Boolean).join(" ").trim();
  return combined || undefined;
}

function parseSignupDate(raw: string | undefined): number {
  if (!raw) return Date.now();
  // OPTIN_TIME format: "2025-05-23 07:01:14"
  const t = Date.parse(raw.replace(" ", "T") + "Z");
  return Number.isFinite(t) ? t : Date.now();
}

async function main() {
  console.log(`Reading CSV: ${CSV_PATH}`);
  const raw = readFileSync(CSV_PATH, "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as CsvRow[];

  console.log(`Parsed ${rows.length} rows from CSV.`);

  const contacts: {
    email: string;
    name?: string;
    tags: string[];
    signupDate: number;
  }[] = [];

  for (const row of rows) {
    const email = (row["Email Address"] ?? "").trim();
    if (!email || !email.includes("@")) continue;

    const tags = parseTags(row["TAGS"]);
    contacts.push({
      email,
      name: buildName(row["First Name"] ?? "", row["Last Name"] ?? ""),
      tags: tags.length ? tags : ["mailchimp-import"],
      signupDate: parseSignupDate(row["OPTIN_TIME"]),
    });
  }

  console.log(`Prepared ${contacts.length} valid contacts. Upserting…`);

  const client = new ConvexHttpClient(CONVEX_URL!);
  // Send in chunks to keep mutation argument size sane.
  const CHUNK = 100;
  let created = 0;
  let updated = 0;
  for (let i = 0; i < contacts.length; i += CHUNK) {
    const chunk = contacts.slice(i, i + CHUNK);
    const r = await client.mutation(api.contacts.bulkUpsertContacts, {
      contacts: chunk,
    });
    created += r.created;
    updated += r.updated;
    console.log(
      `  chunk ${i / CHUNK + 1}: +${r.created} created, ~${r.updated} updated`,
    );
  }

  console.log(`\nDone. Total: created=${created}, updated=${updated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
