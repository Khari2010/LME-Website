/**
 * Convex cron registry. Runs scheduled jobs.
 *
 * Phase 1b cron jobs:
 *   - daily reminder scan (9am UTC) — see convex/reminders.ts
 *   - (future) Xero token refresh every 25 minutes — see convex/xero.ts
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "reminder scan",
  { hourUTC: 9, minuteUTC: 0 },
  internal.remindersAction.dailyTick,
);

// TODO(phase-1b): when Xero is configured, register the access-token refresh:
// crons.interval("xero token refresh", { minutes: 25 }, internal.xero.refreshAccessToken);

export default crons;
