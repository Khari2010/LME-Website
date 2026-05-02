"use client";

import { useState } from "react";

export default function CampaignBody({ html }: { html: string }) {
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setWidth("desktop")}
          className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded transition ${
            width === "desktop"
              ? "bg-teal-400 text-black font-bold"
              : "border border-[#252525] text-gray-400 hover:text-white"
          }`}
        >
          Desktop 600px
        </button>
        <button
          type="button"
          onClick={() => setWidth("mobile")}
          className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded transition ${
            width === "mobile"
              ? "bg-teal-400 text-black font-bold"
              : "border border-[#252525] text-gray-400 hover:text-white"
          }`}
        >
          Mobile 375px
        </button>
      </div>

      <div className="flex justify-center bg-[#0a0a0a] border border-[#252525] rounded-lg p-4">
        <iframe
          srcDoc={html}
          sandbox="allow-same-origin"
          className="bg-white rounded shadow-xl"
          style={{
            width: width === "desktop" ? "600px" : "375px",
            height: "700px",
            maxWidth: "100%",
          }}
          title="Campaign body preview"
        />
      </div>
    </div>
  );
}
