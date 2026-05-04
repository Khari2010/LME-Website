"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

// String form state for inputs; coerced on save. Same pattern as the other
// P3 tabs.
type Stage =
  | "pitched"
  | "interested"
  | "confirmed"
  | "paid"
  | "declined";

const STAGE_OPTIONS: Stage[] = [
  "pitched",
  "interested",
  "confirmed",
  "paid",
  "declined",
];

type ActivationRow = {
  brandName: string;
  contact: string;
  stage: Stage;
  basePackage: string;
  variableCosts: string;
};

export default function SponsorshipTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const setSponsorship = useMutation(api.events.setSponsorship);

  const [activations, setActivations] = useState<ActivationRow[]>([]);
  const [cutoffDate, setCutoffDate] = useState(""); // datetime-local string

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // Hydrate form state on event load. Keyed on _id so we don't clobber edits.
  useEffect(() => {
    if (event?.sponsorship) {
      setActivations(
        event.sponsorship.activations.map((a) => ({
          brandName: a.brandName,
          contact: a.contact ?? "",
          stage: a.stage,
          basePackage: String(a.basePackage),
          variableCosts: a.variableCosts ?? "",
        })),
      );
      setCutoffDate(
        event.sponsorship.cutoffDate
          ? new Date(event.sponsorship.cutoffDate).toISOString().slice(0, 10)
          : "",
      );
    } else {
      setActivations([]);
      setCutoffDate("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?._id]);

  if (event === undefined) return null;
  if (!event) return null;

  // Defensive guard — Sponsorship is MainShow-only at LME's scale. Tab nav
  // already gates this, but a user could land here via direct URL.
  if (event.type !== "MainShow") {
    return (
      <p className="text-sm text-text-muted">
        Sponsorship is only tracked for Main Show events.
      </p>
    );
  }

  function addActivation() {
    setActivations((prev) => [
      ...prev,
      {
        brandName: "",
        contact: "",
        stage: "pitched",
        basePackage: "0",
        variableCosts: "",
      },
    ]);
  }
  function updateActivation(i: number, patch: Partial<ActivationRow>) {
    setActivations((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }
  function removeActivation(i: number) {
    setActivations((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setError("");
    let activationsClean: {
      brandName: string;
      contact?: string;
      stage: Stage;
      basePackage: number;
      variableCosts?: string;
    }[];
    try {
      activationsClean = activations.map((r, i) => {
        if (!r.brandName.trim()) {
          throw new Error(`Activation ${i + 1} needs a brand name`);
        }
        const basePackage = Number(r.basePackage);
        if (!Number.isFinite(basePackage) || basePackage < 0) {
          throw new Error(`Activation ${i + 1} needs a non-negative package`);
        }
        return {
          brandName: r.brandName.trim(),
          contact: r.contact.trim() || undefined,
          stage: r.stage,
          basePackage,
          variableCosts: r.variableCosts.trim() || undefined,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    const cutoffMs = cutoffDate
      ? new Date(cutoffDate).getTime()
      : undefined;

    setSaving(true);
    try {
      await setSponsorship({
        id: id as Id<"events">,
        sponsorship: {
          activations: activationsClean,
          cutoffDate:
            cutoffMs && Number.isFinite(cutoffMs) ? cutoffMs : undefined,
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

  // Pipeline rollups by stage — useful at-a-glance reads on the right side.
  const byStage = STAGE_OPTIONS.reduce(
    (acc, stage) => {
      acc[stage] = activations.filter((a) => a.stage === stage).length;
      return acc;
    },
    {} as Record<Stage, number>,
  );
  const totalConfirmedRevenue = activations
    .filter((a) => a.stage === "confirmed" || a.stage === "paid")
    .reduce((sum, a) => {
      const v = Number(a.basePackage);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-sm uppercase tracking-wide text-text-muted">
          Sponsorship pipeline
        </h2>
        <p className="text-text-body text-sm mt-1">
          Brand activations, deal stages, and the cutoff date for new sponsors.
        </p>
      </div>

      {/* ===== Cutoff + pipeline summary ===== */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-text-muted">Sponsor cutoff date</span>
          <input
            type="date"
            value={cutoffDate}
            onChange={(e) => setCutoffDate(e.target.value)}
            className="mt-1 w-full bg-bg-card border border-border-crm rounded p-2 text-sm"
          />
        </label>
        <div className="bg-bg-surface border border-border-crm rounded p-3 text-sm space-y-1">
          <div className="text-xs uppercase tracking-wide text-text-muted">
            Pipeline
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {STAGE_OPTIONS.map((s) => (
              <span key={s}>
                <span className="text-text-muted">{s}:</span>{" "}
                <span className="text-text-primary">{byStage[s]}</span>
              </span>
            ))}
          </div>
          <div className="text-xs text-text-muted pt-1">
            Confirmed/paid revenue:{" "}
            <span className="text-text-primary font-semibold">
              £{totalConfirmedRevenue.toLocaleString("en-GB")}
            </span>
          </div>
        </div>
      </section>

      {/* ===== Activations list ===== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Activations
            </h3>
            <p className="text-xs text-text-muted">
              {activations.length} brand
              {activations.length === 1 ? "" : "s"} in pipeline
            </p>
          </div>
          <button
            onClick={addActivation}
            className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
          >
            + Add brand
          </button>
        </div>
        {activations.length === 0 ? (
          <div className="bg-bg-surface border border-border-crm rounded p-6 text-center">
            <p className="text-text-body mb-2">No sponsors yet.</p>
            <p className="text-sm text-text-muted">
              Click &quot;+ Add brand&quot; to start pitching.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activations.map((row, i) => (
              <div
                key={i}
                className="bg-bg-surface border border-border-crm rounded p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-muted w-8">
                    #{i + 1}
                  </span>
                  <input
                    value={row.brandName}
                    onChange={(e) =>
                      updateActivation(i, { brandName: e.target.value })
                    }
                    placeholder="Brand name"
                    className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                  />
                  <select
                    value={row.stage}
                    onChange={(e) =>
                      updateActivation(i, { stage: e.target.value as Stage })
                    }
                    className="bg-bg-card border border-border-crm rounded p-2 text-sm"
                    aria-label="Stage"
                  >
                    {STAGE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={row.basePackage}
                    onChange={(e) =>
                      updateActivation(i, { basePackage: e.target.value })
                    }
                    placeholder="£"
                    className="w-24 bg-bg-card border border-border-crm rounded p-2 text-sm"
                    aria-label="Base package"
                  />
                  <button
                    onClick={() => removeActivation(i)}
                    className="px-2 py-1 text-xs text-danger border border-border-crm rounded hover:bg-bg-card"
                    aria-label="Remove activation"
                  >
                    ✕
                  </button>
                </div>
                <div className="ml-10 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    value={row.contact}
                    onChange={(e) =>
                      updateActivation(i, { contact: e.target.value })
                    }
                    placeholder="Contact (name / email / phone)"
                    className="bg-bg-card border border-border-crm rounded p-2 text-xs"
                  />
                  <input
                    value={row.variableCosts}
                    onChange={(e) =>
                      updateActivation(i, { variableCosts: e.target.value })
                    }
                    placeholder="Variable costs (e.g. signage, samples)"
                    className="bg-bg-card border border-border-crm rounded p-2 text-xs"
                  />
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
          {saving ? "Saving…" : "Save sponsorship"}
        </button>
        {savedFlash && <span className="text-sm text-success">✓ Saved</span>}
      </div>
    </div>
  );
}
