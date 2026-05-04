"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

// String form state for inputs; coerced on save. Same pattern as the Show
// Run / Production / After Party / Marketing tabs — keep numbers as strings
// while editing so partial input doesn't crash the form.
type TierRow = {
  name: string;
  price: string;
  capacity: string;
  sold: string;
};

type VoucherRow = {
  code: string;
  discount: string;
  usedCount: string;
  maxUses: string;
};

type Platform = "Eventbrite" | "Skiddle" | "None";
const PLATFORM_OPTIONS: Platform[] = ["Eventbrite", "Skiddle", "None"];

export default function TicketingTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const setTicketing = useMutation(api.events.setTicketing);
  const triggerSync = useMutation(api.events.triggerTicketingSync);

  const [platform, setPlatform] = useState<Platform>("None");
  const [externalEventId, setExternalEventId] = useState("");
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>();

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  // Hydrate form state on event load. Keyed on _id so we don't clobber edits.
  useEffect(() => {
    if (event?.ticketing) {
      setPlatform(event.ticketing.platform);
      setExternalEventId(event.ticketing.externalEventId ?? "");
      setTiers(
        event.ticketing.tiers.map((t) => ({
          name: t.name,
          price: String(t.price),
          capacity: String(t.capacity),
          sold: String(t.sold),
        })),
      );
      setVouchers(
        (event.ticketing.voucherCodes ?? []).map((v) => ({
          code: v.code,
          discount: String(v.discount),
          usedCount: String(v.usedCount),
          maxUses: v.maxUses !== undefined ? String(v.maxUses) : "",
        })),
      );
      setLastSyncedAt(event.ticketing.lastSyncedAt);
    } else {
      setPlatform("None");
      setExternalEventId("");
      setTiers([]);
      setVouchers([]);
      setLastSyncedAt(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?._id]);

  if (event === undefined) return null;
  if (!event) return null;

  // Defensive guard — the tab nav already gates this, but a user could land
  // here via direct URL on a different event type.
  if (event.type !== "MainShow" && event.type !== "PopUp") {
    return (
      <p className="text-sm text-text-muted">
        Ticketing is only available for Main Show / Pop-Up events.
      </p>
    );
  }

  function addTier() {
    setTiers((prev) => [
      ...prev,
      { name: "", price: "0", capacity: "0", sold: "0" },
    ]);
  }
  function updateTier(i: number, patch: Partial<TierRow>) {
    setTiers((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }
  function removeTier(i: number) {
    setTiers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addVoucher() {
    setVouchers((prev) => [
      ...prev,
      { code: "", discount: "10", usedCount: "0", maxUses: "" },
    ]);
  }
  function updateVoucher(i: number, patch: Partial<VoucherRow>) {
    setVouchers((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }
  function removeVoucher(i: number) {
    setVouchers((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setError("");
    let tiersClean: { name: string; price: number; capacity: number; sold: number }[];
    let vouchersClean:
      | { code: string; discount: number; usedCount: number; maxUses?: number }[]
      | undefined;
    try {
      tiersClean = tiers.map((r, i) => {
        if (!r.name.trim()) {
          throw new Error(`Tier ${i + 1} needs a name`);
        }
        const price = Number(r.price);
        const capacity = Number(r.capacity);
        const sold = Number(r.sold);
        if (!Number.isFinite(price) || price < 0) {
          throw new Error(`Tier ${i + 1} needs a non-negative price`);
        }
        if (!Number.isFinite(capacity) || capacity < 0) {
          throw new Error(`Tier ${i + 1} needs a non-negative capacity`);
        }
        if (!Number.isFinite(sold) || sold < 0) {
          throw new Error(`Tier ${i + 1} needs a non-negative sold count`);
        }
        return { name: r.name.trim(), price, capacity, sold };
      });
      const v = vouchers.map((r, i) => {
        if (!r.code.trim()) {
          throw new Error(`Voucher ${i + 1} needs a code`);
        }
        const discount = Number(r.discount);
        const usedCount = Number(r.usedCount);
        const maxUsesNum = r.maxUses.trim() === "" ? undefined : Number(r.maxUses);
        if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
          throw new Error(`Voucher ${i + 1} discount must be 0–100`);
        }
        if (!Number.isFinite(usedCount) || usedCount < 0) {
          throw new Error(`Voucher ${i + 1} used count must be ≥ 0`);
        }
        if (maxUsesNum !== undefined && (!Number.isFinite(maxUsesNum) || maxUsesNum < 0)) {
          throw new Error(`Voucher ${i + 1} max uses must be ≥ 0 or blank`);
        }
        return {
          code: r.code.trim().toUpperCase(),
          discount,
          usedCount,
          maxUses: maxUsesNum,
        };
      });
      vouchersClean = v.length > 0 ? v : undefined;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    setSaving(true);
    try {
      await setTicketing({
        id: id as Id<"events">,
        ticketing: {
          platform,
          externalEventId: externalEventId.trim() || undefined,
          tiers: tiersClean,
          voucherCodes: vouchersClean,
          lastSyncedAt,
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

  async function handleSyncNow() {
    setError("");
    setSyncMessage("");
    if (!externalEventId.trim()) {
      setError("Set an external event ID before syncing");
      return;
    }
    setSyncing(true);
    try {
      await triggerSync({ id: id as Id<"events"> });
      setSyncMessage(
        "Sync scheduled — refresh in a moment to see updated sold counts.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  const totalCapacity = tiers.reduce((sum, t) => {
    const c = Number(t.capacity);
    return sum + (Number.isFinite(c) ? c : 0);
  }, 0);
  const totalSold = tiers.reduce((sum, t) => {
    const s = Number(t.sold);
    return sum + (Number.isFinite(s) ? s : 0);
  }, 0);

  const lastSyncedStr = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString("en-GB")
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-sm uppercase tracking-wide text-text-muted">
          Ticketing
        </h2>
        <p className="text-text-body text-sm mt-1">
          Platform, ticket tiers, and voucher codes for this event.
        </p>
      </div>

      {/* ===== Platform + external ID ===== */}
      <section className="bg-bg-surface border border-border-crm rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-text-muted">Platform</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="mt-1 w-full bg-bg-card border border-border-crm rounded p-2 text-sm"
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">External event ID</span>
            <input
              value={externalEventId}
              onChange={(e) => setExternalEventId(e.target.value)}
              placeholder="e.g. 1234567890"
              className="mt-1 w-full bg-bg-card border border-border-crm rounded p-2 text-sm"
            />
          </label>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSyncNow}
            disabled={syncing || !externalEventId.trim()}
            className="bg-bg-card border border-border-crm text-text-primary px-3 py-1.5 rounded text-sm hover:bg-bg-base disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
          {lastSyncedStr && (
            <span className="text-xs text-text-muted">
              Last synced: {lastSyncedStr}
            </span>
          )}
        </div>
        {syncMessage && (
          <p className="text-xs text-success">{syncMessage}</p>
        )}
      </section>

      {/* ===== Ticket tiers ===== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Ticket tiers
            </h3>
            <p className="text-xs text-text-muted">
              {tiers.length} tier{tiers.length === 1 ? "" : "s"} · {totalSold}/
              {totalCapacity} sold
            </p>
          </div>
          <button
            onClick={addTier}
            className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
          >
            + Add tier
          </button>
        </div>
        {tiers.length === 0 ? (
          <p className="text-sm text-text-muted">No tiers yet.</p>
        ) : (
          <div className="space-y-2">
            {tiers.map((row, i) => (
              <div
                key={i}
                className="bg-bg-surface border border-border-crm rounded p-3 flex items-center gap-2"
              >
                <span className="text-xs font-mono text-text-muted w-8">
                  #{i + 1}
                </span>
                <input
                  value={row.name}
                  onChange={(e) => updateTier(i, { name: e.target.value })}
                  placeholder="Tier name (e.g. Super Early Bird)"
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <input
                  type="number"
                  value={row.price}
                  onChange={(e) => updateTier(i, { price: e.target.value })}
                  placeholder="£"
                  className="w-20 bg-bg-card border border-border-crm rounded p-2 text-sm"
                  aria-label="Price"
                />
                <input
                  type="number"
                  value={row.capacity}
                  onChange={(e) =>
                    updateTier(i, { capacity: e.target.value })
                  }
                  placeholder="cap"
                  className="w-20 bg-bg-card border border-border-crm rounded p-2 text-sm"
                  aria-label="Capacity"
                />
                <input
                  type="number"
                  value={row.sold}
                  onChange={(e) => updateTier(i, { sold: e.target.value })}
                  placeholder="sold"
                  className="w-20 bg-bg-card border border-border-crm rounded p-2 text-sm"
                  aria-label="Sold"
                />
                <button
                  onClick={() => removeTier(i)}
                  className="px-2 py-1 text-xs text-danger border border-border-crm rounded hover:bg-bg-card"
                  aria-label="Remove tier"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Voucher codes ===== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Voucher codes
            </h3>
            <p className="text-xs text-text-muted">
              {vouchers.length} code{vouchers.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={addVoucher}
            className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
          >
            + Add voucher
          </button>
        </div>
        {vouchers.length === 0 ? (
          <p className="text-sm text-text-muted">No voucher codes yet.</p>
        ) : (
          <div className="space-y-2">
            {vouchers.map((row, i) => (
              <div
                key={i}
                className="bg-bg-surface border border-border-crm rounded p-3 flex items-center gap-2"
              >
                <span className="text-xs font-mono text-text-muted w-8">
                  #{i + 1}
                </span>
                <input
                  value={row.code}
                  onChange={(e) => updateVoucher(i, { code: e.target.value })}
                  placeholder="CODE (e.g. POPUP10)"
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm font-mono uppercase"
                />
                <input
                  type="number"
                  value={row.discount}
                  onChange={(e) =>
                    updateVoucher(i, { discount: e.target.value })
                  }
                  placeholder="%"
                  className="w-20 bg-bg-card border border-border-crm rounded p-2 text-sm"
                  aria-label="Discount %"
                />
                <input
                  type="number"
                  value={row.maxUses}
                  onChange={(e) =>
                    updateVoucher(i, { maxUses: e.target.value })
                  }
                  placeholder="max"
                  className="w-20 bg-bg-card border border-border-crm rounded p-2 text-sm"
                  aria-label="Max uses (blank = unlimited)"
                />
                <input
                  type="number"
                  value={row.usedCount}
                  onChange={(e) =>
                    updateVoucher(i, { usedCount: e.target.value })
                  }
                  placeholder="used"
                  className="w-20 bg-bg-card border border-border-crm rounded p-2 text-sm"
                  aria-label="Used count"
                />
                <button
                  onClick={() => removeVoucher(i)}
                  className="px-2 py-1 text-xs text-danger border border-border-crm rounded hover:bg-bg-card"
                  aria-label="Remove voucher"
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
          {saving ? "Saving…" : "Save ticketing"}
        </button>
        {savedFlash && <span className="text-sm text-success">✓ Saved</span>}
      </div>
    </div>
  );
}
