"use client";

import { Fragment, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

const GENRE_PRESETS = [
  "Afrobeats",
  "RnB",
  "Soca",
  "Disco",
  "Funky House",
  "Pop",
  "Dancehall",
  "Gospel",
  "Amapiano",
  "Reggae",
];

type Song = {
  _id: Id<"songs">;
  title: string;
  artist?: string;
  songKey?: string;
  bpm?: number;
  lead?: string;
  genres: string[];
  demoLinks: string[];
  notes?: string;
  archived: boolean;
};

export default function SongsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<Id<"songs"> | null>(null);
  const [adding, setAdding] = useState(false);

  const songs = useQuery(api.songs.list, { includeArchived: showArchived });

  const filtered = (songs ?? []).filter((s: Song) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      (s.artist ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Songs</h1>
        <button
          onClick={() => setAdding(true)}
          className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
        >
          + Add song
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or artist…"
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
        <SongForm
          onCancel={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      )}

      {songs === undefined ? (
        <p className="text-sm text-text-muted">Loading songs…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-surface border border-border-crm rounded p-6 text-center">
          <p className="text-text-body">No songs yet.</p>
          <p className="text-sm text-text-muted">
            Click &ldquo;+ Add song&rdquo; to start your catalogue.
          </p>
        </div>
      ) : (
        <table className="w-full text-sm bg-bg-surface border border-border-crm rounded">
          <thead className="border-b border-border-crm">
            <tr className="text-text-muted text-xs uppercase tracking-wider">
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Artist</th>
              <th className="text-left p-3">Key</th>
              <th className="text-left p-3">BPM</th>
              <th className="text-left p-3">Lead</th>
              <th className="text-left p-3">Genres</th>
              <th className="text-left p-3">Demos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s: Song) => (
              <Fragment key={s._id}>
                <tr
                  onClick={() =>
                    setEditingId(editingId === s._id ? null : s._id)
                  }
                  className={`border-t border-border-crm cursor-pointer hover:bg-bg-card ${
                    s.archived ? "opacity-50" : ""
                  }`}
                >
                  <td className="p-3 text-text-primary">{s.title}</td>
                  <td className="p-3 text-text-body">{s.artist ?? "—"}</td>
                  <td className="p-3 text-text-body">{s.songKey ?? "—"}</td>
                  <td className="p-3 text-text-body">{s.bpm ?? "—"}</td>
                  <td className="p-3 text-text-body">{s.lead ?? "—"}</td>
                  <td className="p-3 text-text-muted text-xs">
                    {s.genres.join(", ") || "—"}
                  </td>
                  <td className="p-3 text-text-muted text-xs">
                    {s.demoLinks.length}
                  </td>
                  <td className="p-3 text-xs text-text-muted">
                    {editingId === s._id ? "▲" : "▼"}
                  </td>
                </tr>
                {editingId === s._id && (
                  <tr>
                    <td colSpan={8} className="p-3 bg-bg-card">
                      <SongForm
                        existing={s}
                        onCancel={() => setEditingId(null)}
                        onSaved={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SongForm({
  existing,
  onCancel,
  onSaved,
}: {
  existing?: Song;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const create = useMutation(api.songs.create);
  const update = useMutation(api.songs.update);
  const setArchived = useMutation(api.songs.setArchived);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [artist, setArtist] = useState(existing?.artist ?? "");
  const [songKey, setSongKey] = useState(existing?.songKey ?? "");
  const [bpm, setBpm] = useState(existing?.bpm?.toString() ?? "");
  const [lead, setLead] = useState(existing?.lead ?? "");
  const [genres, setGenres] = useState<string[]>(existing?.genres ?? []);
  const [demoLinksText, setDemoLinksText] = useState(
    (existing?.demoLinks ?? []).join("\n"),
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleGenre(g: string) {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  }

  async function handleSave() {
    setError("");
    if (!title.trim()) {
      setError("Title required");
      return;
    }
    const bpmNum = bpm.trim() ? Number(bpm) : undefined;
    if (bpmNum != null && !Number.isFinite(bpmNum)) {
      setError("BPM must be a number");
      return;
    }
    const demoLinks = demoLinksText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      if (existing) {
        await update({
          id: existing._id,
          patch: {
            title,
            artist: artist || undefined,
            songKey: songKey || undefined,
            bpm: bpmNum,
            lead: lead || undefined,
            genres,
            demoLinks,
            notes: notes || undefined,
          },
        });
      } else {
        await create({
          title,
          artist: artist || undefined,
          songKey: songKey || undefined,
          bpm: bpmNum,
          lead: lead || undefined,
          genres,
          demoLinks,
          notes: notes || undefined,
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Input label="Title" value={title} onChange={setTitle} required />
        <Input label="Artist" value={artist} onChange={setArtist} />
        <Input
          label="Key"
          value={songKey}
          onChange={setSongKey}
          placeholder="C major"
        />
        <Input label="BPM" value={bpm} onChange={setBpm} type="number" />
        <Input
          label="Lead"
          value={lead}
          onChange={setLead}
          placeholder="Vocalist name"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-text-muted">
          Genres
        </label>
        <div className="flex flex-wrap gap-1 mt-1">
          {GENRE_PRESETS.map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => toggleGenre(g)}
              className={`px-2 py-1 rounded-full text-xs border ${
                genres.includes(g)
                  ? "bg-accent text-bg-base border-accent"
                  : "border-border-crm text-text-muted hover:text-text-body"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-text-muted">
          Demo links (one per line)
        </label>
        <textarea
          value={demoLinksText}
          onChange={(e) => setDemoLinksText(e.target.value)}
          placeholder={"https://soundcloud.com/...\nhttps://youtube.com/watch?v=..."}
          className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-xs font-mono min-h-[60px]"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-text-muted">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-sm min-h-[60px]"
        />
      </div>
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

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-sm"
      />
    </label>
  );
}
