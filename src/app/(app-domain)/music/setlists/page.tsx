"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SetlistRow = {
  _id: string;
  _creationTime: number;
  name: string;
  purpose?: string;
  items: { order: number }[];
};

export default function SetlistsPage() {
  const router = useRouter();
  const create = useMutation(api.setlists.create);
  const setlists = useQuery(api.setlists.list, {});
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setError("");
    if (!name.trim()) {
      setError("Name required");
      return;
    }
    setCreating(true);
    try {
      const id = await create({
        name,
        purpose: purpose || undefined,
      });
      router.push(`/music/setlists/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Setlists</h1>
        <button
          onClick={() => setAdding(true)}
          className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
        >
          + New setlist
        </button>
      </div>

      {adding && (
        <div className="bg-bg-card border border-border-crm rounded p-4 space-y-2">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Purpose (optional)
            </span>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Wedding default · Festival 90 min"
              className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-sm"
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setError("");
              }}
              className="px-3 py-1.5 rounded text-sm border border-border-crm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {setlists === undefined ? (
        <p className="text-sm text-text-muted">Loading setlists…</p>
      ) : setlists.length === 0 ? (
        <div className="bg-bg-surface border border-border-crm rounded p-6 text-center">
          <p className="text-text-body">No setlists yet.</p>
          <p className="text-sm text-text-muted">
            Click &ldquo;+ New setlist&rdquo; to build your first one.
          </p>
        </div>
      ) : (
        <table className="w-full text-sm bg-bg-surface border border-border-crm rounded">
          <thead className="border-b border-border-crm">
            <tr className="text-text-muted text-xs uppercase tracking-wider">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Purpose</th>
              <th className="text-left p-3">Songs</th>
              <th className="text-left p-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {setlists.map((s: SetlistRow) => (
              <tr
                key={s._id}
                className="border-t border-border-crm hover:bg-bg-card"
              >
                <td className="p-3">
                  <Link
                    href={`/music/setlists/${s._id}`}
                    className="text-text-primary hover:text-accent font-semibold"
                  >
                    {s.name}
                  </Link>
                </td>
                <td className="p-3 text-text-body">{s.purpose ?? "—"}</td>
                <td className="p-3 text-text-muted">{s.items.length}</td>
                <td className="p-3 text-text-muted text-xs">
                  {new Date(s._creationTime).toLocaleDateString("en-GB")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
