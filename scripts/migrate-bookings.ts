/**
 * Manual one-shot migration: Notion BOOKINGS → Convex `events`.
 *
 * Prerequisites:
 *   - .env.local has NOTION_API_KEY and NOTION_DATABASE_ID set.
 *   - .env.local has NEXT_PUBLIC_CONVEX_URL pointing at the target deployment
 *     (dev or prod — caller's choice).
 *   - For prod, also set CONVEX_DEPLOY_KEY so the HTTP client can invoke the
 *     `internal` mutation. For dev, the dev deployment lets internal mutations
 *     through without auth.
 *
 * Run:
 *   pnpm migrate:bookings
 *
 * The script pulls every row from the Notion BOOKINGS DB via
 * `src/lib/notion.ts:listBookings`, then for each row calls
 * `internal.migrations.bookingsToEvents.importOne` to insert it as an event.
 */

import { ConvexHttpClient } from "convex/browser";
import { config as loadEnv } from "dotenv";
import type { FunctionReference } from "convex/server";
import { internal } from "../convex/_generated/api";
import { listBookings } from "../src/lib/notion";

// Load .env.local explicitly so NEXT_PUBLIC_CONVEX_URL, NOTION_API_KEY, and
// NOTION_DATABASE_ID are available.
loadEnv({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL not set — make sure .env.local has the deployment URL.",
    );
  }
  const client = new ConvexHttpClient(url);

  // Internal mutations on a prod deployment require a deploy key. On dev
  // deployments they go through anonymously, so this is a no-op there.
  const deployKey = process.env.CONVEX_DEPLOY_KEY;
  if (deployKey) {
    client.setAuth(deployKey);
  }

  const bookings = await listBookings();
  console.log(`Found ${bookings.length} bookings to migrate`);

  // `ConvexHttpClient.mutation` is typed for public mutations only.
  // Internal mutations are still callable over HTTP when the client is
  // authed with a deploy key (or anonymously in dev). We cast the
  // generated reference to the public-mutation shape just to satisfy the
  // type checker — the runtime lookup uses the qualified name string.
  const importOneRef =
    internal.migrations.bookingsToEvents.importOne as unknown as FunctionReference<
      "mutation",
      "public"
    >;

  let imported = 0;
  for (const b of bookings) {
    try {
      await client.mutation(importOneRef, {
        notion: {
          bookingName: b.bookingName,
          clientName: b.clientName,
          clientEmail: b.clientEmail,
          clientPhone: b.clientPhone,
          eventType: b.eventType,
          eventDate: b.eventDate,
          venue: b.venue,
          expectedGuests: b.expectedGuests,
          genres: b.genres,
          djRequired: b.djRequired,
          status: b.status,
          fee: b.fee,
          depositPaid: b.depositPaid,
          notes: b.notes,
        },
      });
      imported += 1;
      if (imported % 25 === 0) console.log(`  …${imported} done`);
    } catch (err) {
      console.error(`Failed for "${b.bookingName}":`, err);
    }
  }

  console.log(
    `Migration complete — ${imported} of ${bookings.length} imported.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
