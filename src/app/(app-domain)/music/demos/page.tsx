"use client";

import { Fragment, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

// P4-T5: Demos library. Mirrors the songs page shape — searchable list with
// inline add form and edit-on-click. Less complex than songs since fewer
// fields. Linked song picker pulls from `api.songs.list` so demos can hang
// off canonical catalogue entries.

type Demo = {
  _id: Id<"demos">;
  title: string;
  url: string;
  description?: string;
  tags: string[];
  linkedSongId?: Id<"songs">;
  archived: boolean;
};

type Song = {
  _id: Id<"songs">;
  title: string;
  artist?: string;
};

export default function DemosPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<Id<"demos"> | null>(null);
  const [adding, setAdding] = useState(false);

  const demos = useQuery(api.demos.list, { includeArchived: showArchived });
  const songs = useQuery(api.songs.list, {});

  const filtered = (demos ?? []).filter((d: Demo) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const songLookup = new Map<string, Song>(
    (songs ?? []).map((s: Song) => [s._id, s]),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Demos</h1>
        <button
          onClick={() => setAdding(true)}
          className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
        >
          + Add demo
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or tag…"
          className="flex-1 bg-bg-surface border border-border-crm rounded p-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="accent-accent"
          />
          Show archived
        </label>
      </div>

      {adding && (
        <DemoForm
          songs={songs ?? []}
          onCancel={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      )}

      {demos === undefined ? (
        <p className="text-sm text-text-muted">Loading demos…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-surface border border-border-crm rounded p-6 text-center">
          <p className="text-text-body">No demos yet.</p>
          <p className="text-sm text-text-muted">
            Click &ldquo;+ Add demo&rdquo; to start your library.
          </p>
        </div>
      ) : (
        <table className="w-full text-sm bg-bg-surface border border-border-crm rounded">
          <thead className="border-b border-border-crm">
            <tr className="text-text-muted text-xs uppercase tracking-wider">
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">URL</th>
              <th className="text-left p-3">Tags</th>
              <th className="text-left p-3">Linked song</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d: Demo) => {
              const linked = d.linkedSongId
                ? songLookup.get(d.linkedSongId)
                : undefined;
              return (
                <Fragment key={d._id}>
                  <tr
                    onClick={() =>
                      setEditingId(editingId === d._id ? null : d._id)
                    }
                    className={`border-t border-border-crm cursor-pointer hover:bg-bg-card ${
                      d.archived ? "opacity-50" : ""
                    }`}
                  >
                    <td className="p-3 text-text-primary">{d.title}</td>
                    <td className="p-3 text-text-body text-xs">
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-accent hover:underline truncate inline-block max-w-[280px]"
                      >
                        {d.url}
                      </a>
                    </td>
                    <td className="p-3 text-text-muted text-xs">
                      {d.tags.join(", ") || "—"}
                    </td>
                    <td className="p-3 text-text-body text-xs">
                      {linked ? linked.title : "—"}
                    </td>
                    <td className="p-3 text-xs text-text-muted">
                      {editingId === d._id ? "▲" : "▼"}
                    </td>
                  </tr>
                  {editingId === d._id && (
                    <tr>
                      <td colSpan={5} className="p-3 bg-bg-card">
                        <DemoForm
                          existing={d}
                          songs={songs ?? []}
                          onCancel={() => setEditingId(null)}
                          onSaved={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DemoForm({
  existing,
  songs,
  onCancel,
  onSaved,
}: {
  existing?: Demo;
  songs: Song[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const create = useMutation(api.demos.create);
  const update = useMutation(api.demos.update);
  const setArchived = useMutation(api.demos.setArchived);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [tagsText, setTagsText] = useState((existing?.tags ?? []).join(", "));
  const [linkedSongId, setLinkedSongId] = useState<string>(
    existing?.linkedSongId ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    if (!title.trim()) {
      setError("Title required");
      return;
    }
    if (!url.trim()) {
      setError("URL required");
      return;
    }
    const tags = tagsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      if (existing) {
        await update({
          id: existing._id,
          patch: {
            title,
            url,
            description: description || undefined,
            tags,
            linkedSongId: linkedSongId
              ? (linkedSongId as Id<"songs">)
              : undefined,
          },
        });
      } else {
        await create({
          title,
          url,
          description: description || undefined,
          tags,
          linkedSongId: linkedSongId
            ? (linkedSongId as Id<"songs">)
            : undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-text-muted">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-text-muted">
            URL
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://soundcloud.com/…"
            className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-sm font-mono"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-text-muted">
          Tags (comma-separated)
        </span>
        <input
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="live, summer, rough mix"
          className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-text-muted">
          Linked song (optional)
        </span>
        <select
          value={linkedSongId}
          onChange={(e) => setLinkedSongId(e.target.value)}
          className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-sm"
        >
          <option value="">— Not linked —</option>
          {songs.map((s) => (
            <option key={s._id} value={s._id}>
              {s.title}
              {s.artist ? ` · ${s.artist}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-text-muted">
          Description
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-sm min-h-[60px]"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : existing ? "Save" : "Create"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded text-sm border border-border-crm"
        >
          Cancel
        </button>
        {existing && (
          <button
            onClick={async () => {
              await setArchived({
                id: existing._id,
                archived: !existing.archived,
              });
              onSaved();
            }}
            className="ml-auto px-3 py-1.5 rounded text-sm border border-border-crm text-text-muted hover:text-danger hover:border-danger"
          >
            {existing.archived ? "Restore" : "Archive"}
          </button>
        )}
      </div>
    </div>
  );
}
