"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Pre-send validation modal. Runs `campaignChecks.runChecks` against the saved
 * draft + selected recipient tags, then shows pass/fail rows. The "Send"
 * button changes copy/style based on whether all checks passed; failures don't
 * hard-block (user can still "Send anyway"), but the styling makes the risk
 * obvious.
 */
export function PreSendChecklist({
  campaignId,
  recipientTags,
  onConfirm,
  onCancel,
}: {
  campaignId: Id<"campaigns">;
  recipientTags: string[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const checks = useQuery(api.campaignChecks.runChecks, {
    campaignId,
    recipientTags,
  });

  const allPassed = checks?.every((c) => c.passed) ?? false;
  const hasFailures = checks?.some((c) => !c.passed) ?? false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="presend-checks-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
    >
      <div className="bg-[#111111] border border-[#252525] rounded-xl max-w-md w-full p-6 space-y-4">
        <h2
          id="presend-checks-title"
          className="text-lg font-bold text-white"
        >
          Pre-send checks
        </h2>

        {checks === undefined ? (
          <p className="text-sm text-gray-400">Running checks…</p>
        ) : (
          <ul className="space-y-2.5">
            {checks.map((c) => (
              <li key={c.id} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 font-bold ${
                    c.passed ? "text-teal-400" : "text-red-400"
                  }`}
                >
                  {c.passed ? "✓" : "✗"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">{c.label}</div>
                  {c.detail && (
                    <div
                      className={`text-xs mt-0.5 ${
                        c.passed ? "text-gray-500" : "text-red-300"
                      }`}
                    >
                      {c.detail}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasFailures && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-md px-3 py-2 text-xs text-red-300">
            Fix the issues above before sending. (Or send anyway if you know what
            you&apos;re doing.)
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={checks === undefined}
            className={`flex-1 px-4 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              allPassed
                ? "bg-teal-500 hover:bg-teal-400 text-black"
                : "bg-transparent text-white border border-red-500/60 hover:border-red-400"
            }`}
          >
            {checks === undefined
              ? "Checking…"
              : allPassed
                ? "All checks passed — Send"
                : "Send anyway"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-transparent border border-[#252525] hover:border-gray-500 text-gray-300 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
