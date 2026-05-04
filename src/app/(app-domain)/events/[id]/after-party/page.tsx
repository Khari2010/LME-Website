"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

// String form state for inputs; coerced on save. Same pattern as the Show
// Run / Production tabs.
type SectionRow = { name: string; genre: string; durationMins: string };

export default function AfterPartyTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const setAfterParty = useMutation(api.events.setAfterParty);

  const [venue, setVenue] = useState("");
  const [host, setHost] = useState("");
  const [djLineup, setDjLineup] = useState<string[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // Hydrate form state on event load. Keyed on _id so we don't clobber edits
  // on every Convex re-render. Same pattern as the Show Run / Production tabs.
  useEffect(() => {
    if (event?.afterParty) {
      setVenue(event.afterParty.venue ?? "");
      setHost(event.afterParty.host ?? "");
      setDjLineup([...event.afterParty.djLineup]);
      setSections(
        event.afterParty.sections.map((s) => ({
          name: s.name,
          genre: s.genre,
          durationMins: String(s.durationMins),
        })),
      );
    } else {
      setVenue("");
      setHost("");
      setDjLineup([]);
      setSections([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?._id]);

  if (event === undefined) return null;
  if (!event) return null;

  // Defensive guard — the tab nav already gates this, but a user could land
  // here via direct URL on an event that isn't a MainShow.
  if (event.type !== "MainShow") {
    return (
      <p className="text-sm text-text-muted">
        After Party is only available for Main Show events.
      </p>
    );
  }

  function updateDj(index: number, value: string) {
    setDjLineup((prev) => prev.map((d, i) => (i === index ? value : d)));
  }
  function addDj() {
    setDjLineup((prev) => [...prev, ""]);
  }
  function removeDj(index: number) {
    setDjLineup((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSection(index: number, patch: Partial<SectionRow>) {
    setSections((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }
  function addSection() {
    setSections((prev) => [
      ...prev,
      { name: "", genre: "", durationMins: "30" },
    ]);
  }
  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError("");
    let djClean: string[];
    let sectionsClean;
    try {
      djClean = djLineup.map((d, i) => {
        const trimmed = d.trim();
        if (!trimmed) throw new Error(`DJ row ${i + 1} needs a name`);
        return trimmed;
      });
      sectionsClean = sections.map((r, i) => {
        if (!r.name.trim()) {
          throw new Error(`Section row ${i + 1} needs a name`);
        }
        if (!r.genre.trim()) {
          throw new Error(`Section row ${i + 1} needs a genre`);
        }
        const dur = Number(r.durationMins);
        if (!Number.isFinite(dur) || dur <= 0) {
          throw new Error(`Section row ${i + 1} needs a positive duration`);
        }
        return {
          name: r.name.trim(),
          genre: r.genre.trim(),
          durationMins: dur,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    const payload = {
      venue: venue.trim() || undefined,
      host: host.trim() || undefined,
      djLineup: djClean,
      sections: sectionsClean,
    };

    setSaving(true);
    try {
      await setAfterParty({ id: id as Id<"events">, afterParty: payload });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const totalMins = sections.reduce((sum, r) => {
    const d = Number(r.durationMins);
    return sum + (Number.isFinite(d) ? d : 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-sm uppercase tracking-wide text-text-muted">
          After Party
        </h2>
        <p className="text-text-body text-sm mt-1">
          Venue, host, DJ lineup and section breakdown.
        </p>
      </div>

      {/* ===== Venue + Host ===== */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-text-muted">Venue</span>
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g. Mama's Lounge"
            className="mt-1 w-full bg-bg-card border border-border-crm rounded p-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-text-muted">Host</span>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="Host name"
            className="mt-1 w-full bg-bg-card border border-border-crm rounded p-2 text-sm"
          />
        </label>
      </section>

      {/* ===== DJ lineup ===== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">DJ lineup</h3>
          <button
            onClick={addDj}
            className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
          >
            + Add DJ
          </button>
        </div>
        {djLineup.length === 0 ? (
          <p className="text-sm text-text-muted">No DJs added yet.</p>
        ) : (
          <div className="space-y-2">
            {djLineup.map((dj, i) => (
              <div
                key={i}
                className="bg-bg-surface border border-border-crm rounded p-3 flex items-center gap-2"
              >
                <span className="text-xs font-mono text-text-muted w-8">
                  #{i + 1}
                </span>
                <input
                  value={dj}
                  onChange={(e) => updateDj(i, e.target.value)}
                  placeholder="DJ name"
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <button
                  onClick={() => removeDj(i)}
                  className="px-2 py-1 text-xs text-danger border border-border-crm rounded hover:bg-bg-card"
                  aria-label="Remove DJ row"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Sections ===== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Sections</h3>
            <p className="text-xs text-text-muted">
              {sections.length} section{sections.length === 1 ? "" : "s"} ·{" "}
              {totalMins} mins total
            </p>
          </div>
          <button
            onClick={addSection}
            className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
          >
            + Add section
          </button>
        </div>
        {sections.length === 0 ? (
          <p className="text-sm text-text-muted">No sections added yet.</p>
        ) : (
          <div className="space-y-2">
            {sections.map((row, i) => (
              <div
                key={i}
                className="bg-bg-surface border border-border-crm rounded p-3 flex items-center gap-2"
              >
                <span className="text-xs font-mono text-text-muted w-8">
                  #{i + 1}
                </span>
                <input
                  value={row.name}
                  onChange={(e) => updateSection(i, { name: e.target.value })}
                  placeholder="Section name"
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <input
                  value={row.genre}
                  onChange={(e) => updateSection(i, { genre: e.target.value })}
                  placeholder="Genre (e.g. Tribal House)"
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <input
                  type="number"
                  value={row.durationMins}
                  onChange={(e) =>
                    updateSection(i, { durationMins: e.target.value })
                  }
                  placeholder="mins"
                  className="w-20 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <button
                  onClick={() => removeSection(i)}
                  className="px-2 py-1 text-xs text-danger border border-border-crm rounded hover:bg-bg-card"
                  aria-label="Remove section row"
                >
                  ✕
                </button>
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
          {saving ? "Saving…" : "Save after party"}
        </button>
        {savedFlash && <span className="text-sm text-success">✓ Saved</span>}
      </div>
    </div>
  );
}
