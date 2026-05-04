"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

// String form state for inputs; coerced on save. `weekIndex` and
// `scheduledAt` are kept as strings so partial input (e.g. an empty number
// field while editing) doesn't crash the form. Same pattern as the Show Run
// / Production / After Party tabs.
type PostRow = {
  platform: string;
  copy: string;
  scheduledAt: string; // datetime-local string
  sent: boolean;
};

type WeekRow = {
  weekIndex: string;
  theme: string;
  posts: PostRow[];
};

const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "Email",
  "Twitter",
  "Facebook",
  "YouTube",
  "Other",
];

export default function MarketingTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const setPlan = useMutation(api.events.setMarketingPlan);

  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [eventbriteUrl, setEventbriteUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // Hydrate form state on event load. Keyed on _id so we don't clobber edits
  // on every Convex re-render. Same pattern as the other P3 tabs.
  useEffect(() => {
    if (event?.marketingPlan) {
      setWeeks(
        event.marketingPlan.weeks.map((w) => ({
          weekIndex: String(w.weekIndex),
          theme: w.theme,
          posts: w.posts.map((p) => ({
            platform: p.platform,
            copy: p.copy,
            scheduledAt: p.scheduledAt
              ? new Date(p.scheduledAt).toISOString().slice(0, 16)
              : "",
            sent: p.sent,
          })),
        })),
      );
      setEventbriteUrl(event.marketingPlan.eventbriteUrl ?? "");
    } else {
      setWeeks([]);
      setEventbriteUrl("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?._id]);

  if (event === undefined) return null;
  if (!event) return null;

  // Defensive guard — the tab nav already gates this, but a user could land
  // here via direct URL on a different event type.
  if (
    event.type !== "MainShow" &&
    event.type !== "PopUp" &&
    event.type !== "Festival"
  ) {
    return (
      <p className="text-sm text-text-muted">
        Marketing plans are for MainShow / PopUp / Festival events.
      </p>
    );
  }

  function addWeek() {
    setWeeks((prev) => [
      ...prev,
      { weekIndex: String(prev.length + 1), theme: "", posts: [] },
    ]);
  }

  function removeWeek(index: number) {
    setWeeks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateWeek(index: number, patch: Partial<WeekRow>) {
    setWeeks((prev) =>
      prev.map((w, i) => (i === index ? { ...w, ...patch } : w)),
    );
  }

  function addPost(weekIndex: number) {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIndex
          ? {
              ...w,
              posts: [
                ...w.posts,
                {
                  platform: "Instagram",
                  copy: "",
                  scheduledAt: "",
                  sent: false,
                },
              ],
            }
          : w,
      ),
    );
  }

  function updatePost(
    weekIndex: number,
    postIndex: number,
    patch: Partial<PostRow>,
  ) {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIndex
          ? {
              ...w,
              posts: w.posts.map((p, pi) =>
                pi === postIndex ? { ...p, ...patch } : p,
              ),
            }
          : w,
      ),
    );
  }

  function removePost(weekIndex: number, postIndex: number) {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === weekIndex
          ? { ...w, posts: w.posts.filter((_, pi) => pi !== postIndex) }
          : w,
      ),
    );
  }

  async function handleSave() {
    setError("");
    try {
      const planWeeks = weeks.map((w, i) => {
        const wi = Number(w.weekIndex);
        if (!Number.isFinite(wi)) {
          throw new Error(`Week ${i + 1} needs a numeric index`);
        }
        return {
          weekIndex: wi,
          theme: w.theme,
          posts: w.posts.map((p, pi) => {
            if (!p.copy.trim()) {
              throw new Error(`Week ${i + 1} post ${pi + 1} is empty`);
            }
            const scheduledMs = p.scheduledAt
              ? new Date(p.scheduledAt).getTime()
              : undefined;
            return {
              platform: p.platform,
              copy: p.copy,
              scheduledAt:
                scheduledMs && Number.isFinite(scheduledMs)
                  ? scheduledMs
                  : undefined,
              sent: p.sent,
            };
          }),
        };
      });
      setSaving(true);
      await setPlan({
        id: id as Id<"events">,
        plan: {
          weeks: planWeeks,
          eventbriteUrl: eventbriteUrl.trim() || undefined,
        },
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const totalPosts = weeks.reduce((sum, w) => sum + w.posts.length, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="bg-bg-surface border border-border-crm rounded p-4 space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-text-muted">
          Eventbrite URL
        </h2>
        <input
          value={eventbriteUrl}
          onChange={(e) => setEventbriteUrl(e.target.value)}
          placeholder="https://www.eventbrite.co.uk/e/..."
          className="w-full bg-bg-card border border-border-crm rounded p-2 text-sm"
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm uppercase tracking-wide text-text-muted">
              Marketing plan
            </h2>
            <p className="text-text-body text-sm mt-1">
              {weeks.length} week{weeks.length === 1 ? "" : "s"} · {totalPosts}{" "}
              post{totalPosts === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={addWeek}
            className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
          >
            + Add week
          </button>
        </div>

        {weeks.length === 0 ? (
          <div className="bg-bg-surface border border-border-crm rounded p-6 text-center">
            <p className="text-text-body mb-2">No marketing plan yet.</p>
            <p className="text-sm text-text-muted">
              Click &quot;+ Add week&quot; to start phasing your campaign.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className="bg-bg-surface border border-border-crm rounded p-3 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={week.weekIndex}
                    onChange={(e) =>
                      updateWeek(wi, { weekIndex: e.target.value })
                    }
                    className="w-16 bg-bg-card border border-border-crm rounded p-2 text-sm"
                    aria-label="Week index"
                  />
                  <input
                    value={week.theme}
                    onChange={(e) => updateWeek(wi, { theme: e.target.value })}
                    placeholder="Theme (e.g. 'Tease announcement')"
                    className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                  />
                  <button
                    onClick={() => removeWeek(wi)}
                    className="px-2 py-1 text-xs text-danger border border-border-crm rounded hover:bg-bg-card"
                    aria-label="Remove week"
                  >
                    ✕
                  </button>
                </div>

                <div className="ml-6 space-y-2">
                  {week.posts.map((post, pi) => (
                    <div
                      key={pi}
                      className="bg-bg-card border border-border-crm rounded p-2 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <select
                          value={post.platform}
                          onChange={(e) =>
                            updatePost(wi, pi, { platform: e.target.value })
                          }
                          className="bg-bg-surface border border-border-crm rounded p-1.5 text-xs"
                        >
                          {PLATFORM_OPTIONS.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                        <input
                          type="datetime-local"
                          value={post.scheduledAt}
                          onChange={(e) =>
                            updatePost(wi, pi, { scheduledAt: e.target.value })
                          }
                          className="flex-1 bg-bg-surface border border-border-crm rounded p-1.5 text-xs"
                        />
                        <label className="flex items-center gap-1 text-xs text-text-muted">
                          <input
                            type="checkbox"
                            checked={post.sent}
                            onChange={(e) =>
                              updatePost(wi, pi, { sent: e.target.checked })
                            }
                            className="accent-accent"
                          />
                          Sent
                        </label>
                        <button
                          onClick={() => removePost(wi, pi)}
                          className="px-2 py-0.5 text-xs text-danger border border-border-crm rounded hover:bg-bg-surface"
                          aria-label="Remove post"
                        >
                          ✕
                        </button>
                      </div>
                      <textarea
                        value={post.copy}
                        onChange={(e) =>
                          updatePost(wi, pi, { copy: e.target.value })
                        }
                        placeholder="Post copy…"
                        className="w-full bg-bg-surface border border-border-crm rounded p-2 text-xs min-h-[60px]"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => addPost(wi)}
                    className="text-xs text-accent hover:text-accent-hover"
                  >
                    + Add post
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-bg-base px-4 py-2 rounded font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save plan"}
        </button>
        {savedFlash && <span className="text-sm text-success">✓ Saved</span>}
      </div>
    </div>
  );
}
