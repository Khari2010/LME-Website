"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Client-side e-sign form. Renders the server-generated contract HTML
// (escaped server-side in `renderStandardContract`) plus a name input +
// agree checkbox. On submit, calls `contracts.signContract`, which validates
// the token, stamps `signedAt` + `signedByName`, and appends the audit log
// entry.
//
// `dangerouslySetInnerHTML` is safe here because the HTML originates from
// `convex/contracts.getContractData` -> `renderStandardContract`, which
// escapes every interpolated user value via `escape()`. Do not bypass that.
export function ContractSignClient({
  token,
  html,
  signedAt,
  signedByName,
}: {
  token: string;
  html: string;
  signedAt: number | null;
  signedByName: string | null;
}) {
  const sign = useMutation(api.contracts.signContract);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  // Seed initial state from server-fetched signing record so a refresh after
  // signing shows the confirmation rather than the form.
  const [state, setState] = useState<
    "idle" | "signing" | "signed" | "error"
  >(signedAt ? "signed" : "idle");
  const [error, setError] = useState("");
  const [signedNameLocal, setSignedNameLocal] = useState<string | null>(null);
  const [signedAtLocal, setSignedAtLocal] = useState<number | null>(null);

  async function handleSign() {
    if (!name.trim() || !agreed) return;
    setState("signing");
    setError("");
    try {
      await sign({ token, signedByName: name });
      setSignedNameLocal(name);
      setSignedAtLocal(Date.now());
      setState("signed");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const isSigned = state === "signed" || signedAt !== null;
  const displayName = signedByName ?? signedNameLocal;
  const displayDate = signedAt ?? signedAtLocal ?? Date.now();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Your contract</h1>

      {/* Render the contract HTML in a contained block. dangerouslySetInnerHTML
          is safe here because the HTML is server-generated from typed data
          with all interpolations escaped via `renderStandardContract`. */}
      <div
        className="bg-white text-black rounded overflow-hidden"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {isSigned ? (
        <div className="bg-[#0e2a25] border border-[#14B8A6] rounded p-5">
          <p className="text-[#5EEAD4] font-semibold">✓ Signed</p>
          <p className="text-sm text-[#C4C4C4]">
            By {displayName ?? "—"} on{" "}
            {new Date(displayDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#252525] rounded p-5 space-y-4">
          <h2 className="text-xs uppercase tracking-wider text-[#5EEAD4]">
            Sign
          </h2>
          <div>
            <label
              htmlFor="contract-sign-name"
              className="block text-xs uppercase tracking-wider text-[#8A8A8A] mb-2"
            >
              Type your full name
            </label>
            <input
              id="contract-sign-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#252525] rounded p-2"
              placeholder="Your full legal name"
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="accent-[#14B8A6] mt-1"
            />
            <span className="text-sm text-[#C4C4C4]">
              I have read and agree to the terms of this contract. By
              submitting, I acknowledge that this constitutes a legally
              binding electronic signature.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-[#ff6b6b]">
              {error}
            </p>
          )}
          <button
            onClick={handleSign}
            disabled={!name.trim() || !agreed || state === "signing"}
            className="w-full bg-[#14B8A6] text-black px-4 py-3 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === "signing" ? "Signing…" : "Sign contract"}
          </button>
        </div>
      )}
    </div>
  );
}
