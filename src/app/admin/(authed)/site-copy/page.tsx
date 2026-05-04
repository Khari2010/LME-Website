"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

const SUGGESTED_KEYS = [
  "homepage.hero.tagline",
  "homepage.about.heading",
  "homepage.about.body",
  "setlist.intro",
  "bookingform.intro",
  "enhancers.signup.intro",
];

type Row = {
  _id: Id<"siteCopy">;
  key: string;
  value: string;
  updatedAt: number;
  updatedBy?: string;
};

export default function SiteCopyPage() {
  const rows = useQuery(api.siteCopy.list, {});
  const setByKey = useMutation(api.siteCopy.setByKey);
  const remove = useMutation(api.siteCopy.remove);
  const { user } = useUser();
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const updatedBy =
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "Unknown";

  async function handleAdd() {
    if (!newKey.trim()) return;
    await setByKey({ key: newKey.trim(), value: newValue, updatedBy });
    setNewKey("");
    setNewValue("");
    setAdding(false);
  }

  const existingKeys = new Set((rows ?? []).map((r) => r.key));
  const missingSuggestions = SUGGESTED_KEYS.filter(
    (k) => !existingKeys.has(k),
  );

  return (
    <div className="text-white max-w-4xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-teal-400">
          LME · Admin
        </p>
        <h1 className="text-3xl font-bold mt-1">Site copy</h1>
        <p className="text-gray-500 text-sm mt-1">
          Edit text that appears on the public site without a code deploy.
          Pages fall back to hardcoded text when no key is set.
        </p>
      </header>

      <section className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-gray-400">
            Add a key
          </h2>
          <button
            type="button"
            onClick={() => setAdding(!adding)}
            className="text-xs text-teal-400 hover:text-teal-300"
          >
            {adding ? "Cancel" : "+ New key"}
          </button>
        </div>
        {adding && (
          <div className="space-y-2">
            <input
              list="suggested-keys"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="e.g. homepage.hero.tagline"
              className="w-full bg-[#0a0a0a] border border-[#252525] text-white px-3 py-2 rounded text-sm focus:border-teal-400 focus:outline-none"
            />
            <datalist id="suggested-keys">
              {missingSuggestions.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
            <textarea
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value (the text that will appear on the public site)"
              className="w-full bg-[#0a0a0a] border border-[#252525] text-white px-3 py-2 rounded text-sm min-h-[80px] focus:border-teal-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newKey.trim()}
              className="bg-teal-400 text-black uppercase tracking-wider font-bold text-sm px-5 py-2 rounded hover:bg-teal-300 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        )}
      </section>

      {rows === undefined ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No keys yet. Add one above to start overriding hardcoded copy.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <CopyRow
              key={row._id}
              row={row}
              updatedBy={updatedBy}
              setByKey={setByKey}
              remove={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CopyRow({
  row,
  updatedBy,
  setByKey,
  remove,
}: {
  row: Row;
  updatedBy: string;
  setByKey: (args: {
    key: string;
    value: string;
    updatedBy?: string;
  }) => Promise<null>;
  remove: (args: { id: Id<"siteCopy"> }) => Promise<null>;
}) {
  const [value, setValue] = useState(row.value);
  const [saving, setSaving] = useState(false);
  const dirty = value !== row.value;

  async function handleSave() {
    setSaving(true);
    try {
      await setByKey({ key: row.key, value, updatedBy });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#111111] border border-[#252525] rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <code className="text-xs text-teal-400 font-mono">{row.key}</code>
        <span className="text-xs text-gray-500">
          Updated {new Date(row.updatedAt).toLocaleDateString("en-GB")}
          {row.updatedBy && ` by ${row.updatedBy}`}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full bg-[#0a0a0a] border border-[#252525] text-white px-3 py-2 rounded text-sm min-h-[80px] focus:border-teal-400 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="bg-teal-400 text-black uppercase tracking-wider font-bold text-sm px-4 py-1.5 rounded hover:bg-teal-300 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (
              confirm(
                `Delete "${row.key}"? Public site will fall back to hardcoded text.`,
              )
            ) {
              await remove({ id: row._id });
            }
          }}
          className="text-xs text-gray-500 hover:text-red-400 ml-auto"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
