"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

// String form state for inputs; coerced/split on save. Same shape pattern as
// the Show Run tab — it keeps "empty" inputs as `""` instead of NaN/0 and
// avoids fighting with React's controlled-input semantics.
type CrewRow = { name: string; role: string; contact: string };
type SupplierRow = { name: string; service: string; cost: string };

// `<input type="datetime-local">` returns a "YYYY-MM-DDTHH:mm" string. We
// store ms in Convex, so convert both ways. Returns "" if ts is undefined or
// invalid (the input is happy with empty).
function tsToLocalInput(ts: number | undefined): string {
  if (ts === undefined || !Number.isFinite(ts)) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToTs(s: string): number | undefined {
  if (!s.trim()) return undefined;
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

export default function ProductionTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const setProduction = useMutation(api.events.setProduction);

  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loadIn, setLoadIn] = useState("");
  const [loadOut, setLoadOut] = useState("");
  const [riderUrl, setRiderUrl] = useState("");
  const [decorTeam, setDecorTeam] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // Hydrate form state on event load. Keyed on _id so we don't clobber edits
  // on every Convex re-render. Same pattern as the Show Run tab.
  useEffect(() => {
    if (event?.production) {
      setCrew(
        event.production.crew.map((c) => ({
          name: c.name,
          role: c.role,
          contact: c.contact ?? "",
        })),
      );
      setSuppliers(
        event.production.suppliers.map((s) => ({
          name: s.name,
          service: s.service,
          cost: s.cost !== undefined ? String(s.cost) : "",
        })),
      );
      setLoadIn(tsToLocalInput(event.production.loadIn));
      setLoadOut(tsToLocalInput(event.production.loadOut));
      setRiderUrl(event.production.riderUrl ?? "");
      setDecorTeam(event.production.decorTeam ?? "");
    } else {
      setCrew([]);
      setSuppliers([]);
      setLoadIn("");
      setLoadOut("");
      setRiderUrl("");
      setDecorTeam("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?._id]);

  if (event === undefined) return null;
  if (!event) return null;

  // Defensive guard — the tab nav already gates this, but a user could land
  // here via direct URL on an event whose type doesn't support production.
  if (event.type !== "MainShow" && event.type !== "Festival") {
    return (
      <p className="text-sm text-text-muted">
        Production is only available for Main Show / Festival events.
      </p>
    );
  }

  function updateCrew(index: number, patch: Partial<CrewRow>) {
    setCrew((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }
  function addCrew() {
    setCrew((prev) => [...prev, { name: "", role: "", contact: "" }]);
  }
  function removeCrew(index: number) {
    setCrew((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSupplier(index: number, patch: Partial<SupplierRow>) {
    setSuppliers((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }
  function addSupplier() {
    setSuppliers((prev) => [...prev, { name: "", service: "", cost: "" }]);
  }
  function removeSupplier(index: number) {
    setSuppliers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError("");
    let crewClean;
    let suppliersClean;
    try {
      crewClean = crew.map((r, i) => {
        if (!r.name.trim()) throw new Error(`Crew row ${i + 1} needs a name`);
        if (!r.role.trim()) throw new Error(`Crew row ${i + 1} needs a role`);
        return {
          name: r.name.trim(),
          role: r.role.trim(),
          contact: r.contact.trim() || undefined,
        };
      });
      suppliersClean = suppliers.map((r, i) => {
        if (!r.name.trim()) throw new Error(`Supplier row ${i + 1} needs a name`);
        if (!r.service.trim()) {
          throw new Error(`Supplier row ${i + 1} needs a service`);
        }
        let cost: number | undefined;
        if (r.cost.trim()) {
          const parsed = Number(r.cost);
          if (!Number.isFinite(parsed) || parsed < 0) {
            throw new Error(`Supplier row ${i + 1} has an invalid cost`);
          }
          cost = parsed;
        }
        return {
          name: r.name.trim(),
          service: r.service.trim(),
          cost,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    const payload = {
      crew: crewClean,
      suppliers: suppliersClean,
      loadIn: localInputToTs(loadIn),
      loadOut: localInputToTs(loadOut),
      riderUrl: riderUrl.trim() || undefined,
      decorTeam: decorTeam.trim() || undefined,
    };

    setSaving(true);
    try {
      await setProduction({ id: id as Id<"events">, production: payload });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-sm uppercase tracking-wide text-text-muted">
          Production
        </h2>
        <p className="text-text-body text-sm mt-1">
          Crew, suppliers, load-in/out, decor and rider URL.
        </p>
      </div>

      {/* ===== Crew ===== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Crew</h3>
          <button
            onClick={addCrew}
            className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
          >
            + Add crew
          </button>
        </div>
        {crew.length === 0 ? (
          <p className="text-sm text-text-muted">No crew added yet.</p>
        ) : (
          <div className="space-y-2">
            {crew.map((row, i) => (
              <div
                key={i}
                className="bg-bg-surface border border-border-crm rounded p-3 flex items-center gap-2"
              >
                <span className="text-xs font-mono text-text-muted w-8">
                  #{i + 1}
                </span>
                <input
                  value={row.name}
                  onChange={(e) => updateCrew(i, { name: e.target.value })}
                  placeholder="Name"
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <input
                  value={row.role}
                  onChange={(e) => updateCrew(i, { role: e.target.value })}
                  placeholder="Role (e.g. FOH, lighting)"
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <input
                  value={row.contact}
                  onChange={(e) => updateCrew(i, { contact: e.target.value })}
                  placeholder="Contact (optional)"
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <button
                  onClick={() => removeCrew(i)}
                  className="px-2 py-1 text-xs text-danger border border-border-crm rounded hover:bg-bg-card"
                  aria-label="Remove crew row"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Suppliers ===== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Suppliers</h3>
          <button
            onClick={addSupplier}
            className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
          >
            + Add supplier
          </button>
        </div>
        {suppliers.length === 0 ? (
          <p className="text-sm text-text-muted">No suppliers added yet.</p>
        ) : (
          <div className="space-y-2">
            {suppliers.map((row, i) => (
              <div
                key={i}
                className="bg-bg-surface border border-border-crm rounded p-3 flex items-center gap-2"
              >
                <span className="text-xs font-mono text-text-muted w-8">
                  #{i + 1}
                </span>
                <input
                  value={row.name}
                  onChange={(e) => updateSupplier(i, { name: e.target.value })}
                  placeholder="Supplier name"
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <input
                  value={row.service}
                  onChange={(e) =>
                    updateSupplier(i, { service: e.target.value })
                  }
                  placeholder="Service (e.g. PA, lighting hire)"
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <input
                  type="number"
                  value={row.cost}
                  onChange={(e) => updateSupplier(i, { cost: e.target.value })}
                  placeholder="Cost (£)"
                  className="w-28 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <button
                  onClick={() => removeSupplier(i)}
                  className="px-2 py-1 text-xs text-danger border border-border-crm rounded hover:bg-bg-card"
                  aria-label="Remove supplier row"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Load-in / Load-out ===== */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Load-in / Load-out</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-text-muted">Load-in</span>
            <input
              type="datetime-local"
              value={loadIn}
              onChange={(e) => setLoadIn(e.target.value)}
              className="mt-1 w-full bg-bg-card border border-border-crm rounded p-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Load-out</span>
            <input
              type="datetime-local"
              value={loadOut}
              onChange={(e) => setLoadOut(e.target.value)}
              className="mt-1 w-full bg-bg-card border border-border-crm rounded p-2 text-sm"
            />
          </label>
        </div>
      </section>

      {/* ===== Rider URL & decor ===== */}
      <section className="space-y-3">
        <label className="block">
          <span className="text-xs text-text-muted">Rider URL</span>
          <input
            type="url"
            value={riderUrl}
            onChange={(e) => setRiderUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full bg-bg-card border border-border-crm rounded p-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-text-muted">Decor team</span>
          <textarea
            value={decorTeam}
            onChange={(e) => setDecorTeam(e.target.value)}
            placeholder="Notes on the decor team (size, lead, briefing)…"
            className="mt-1 w-full bg-bg-card border border-border-crm rounded p-2 text-sm min-h-[60px]"
          />
        </label>
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
          {saving ? "Saving…" : "Save production"}
        </button>
        {savedFlash && <span className="text-sm text-success">✓ Saved</span>}
      </div>
    </div>
  );
}
