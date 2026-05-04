import { mutation } from "./_generated/server";
import { v } from "convex/values";

// P4-T7: replace the entire `meetingDetails` sub-block on a Team Diary event.
// Same approach as the other sub-block mutations (setProduction, setShowRun,
// etc.) — UI sends the full block on save and we patch in one shot. We
// hard-gate to `family === "TeamDiary"` because the other event families
// don't surface this tab and shouldn't accidentally accumulate meeting notes
// (e.g. via a stale tab left open).

export const setMeetingDetails = mutation({
  args: {
    id: v.id("events"),
    details: v.object({
      attendees: v.array(v.string()),
      transcript: v.optional(v.string()),
      decisions: v.array(v.string()),
      actions: v.array(
        v.object({
          description: v.string(),
          assignee: v.optional(v.string()),
          done: v.boolean(),
        }),
      ),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    if (event.family !== "TeamDiary") {
      throw new Error("only Team Diary events have meeting details");
    }
    await ctx.db.patch(args.id, { meetingDetails: args.details });
    return null;
  },
});
