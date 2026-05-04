/**
 * Manual one-shot migration: Notion BOOKINGS → Convex `events`.
 *
 * This script ONLY exports the Notion rows to a JSON file. The actual import
 * into Convex is done by invoking the internal `importBatch` mutation via the
 * Convex CLI (`convex run`), which handles deploy-key authentication
 * correctly. `ConvexHttpClient.setAuth` expects a Clerk JWT, NOT a Convex
 * deploy key — so we can't use it for prod imports.
 *
 * Prerequisites:
 *   - .env.local has NOTION_API_KEY and NOTION_DATABASE_ID set.
 *
 * Run:
 *   pnpm migrate:bookings
 *
 * The script pulls every row from the Notion BOOKINGS DB via
 * `src/lib/notion.ts:listBookings` and writes them to
 * `scripts/bookings-export.json`. It then prints the `convex run` command
 * to invoke against the target deployment.
 */

import { config as loadEnv } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { listBookings } from "../src/lib/notion";

// Load .env.local explicitly so NOTION_API_KEY and NOTION_DATABASE_ID are
// available when this script is run via `pnpm migrate:bookings`.
loadEnv({ path: ".env.local" });

async function main() {
  const bookings = await listBookings();
  console.log(`Found ${bookings.length} bookings in Notion`);

  const outPath = resolve(process.cwd(), "scripts/bookings-export.json");
  // The internal mutation expects { bookings: [...] } as its single arg.
  writeFileSync(outPath, JSON.stringify({ bookings }, null, 2), "utf8");
  console.log(`✓ Exported ${bookings.length} bookings to ${outPath}`);
  console.log("");
  console.log("To import them into Convex prod, run:");
  console.log("");
  console.log(
    `  CONVEX_DEPLOY_KEY=prod:... pnpm dlx convex run --prod migrations/bookingsToEvents:importBatch "$(cat scripts/bookings-export.json)"`,
  );
  console.log("");
  console.log("To import into the dev deployment instead:");
  console.log("");
  console.log(
    `  pnpm dlx convex run migrations/bookingsToEvents:importBatch "$(cat scripts/bookings-export.json)"`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
