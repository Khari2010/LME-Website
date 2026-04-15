"use client";

import { useState } from "react";
import Link from "next/link";
import { MEDLEYS, GENRES, GENRE_COLOURS, type Genre } from "@/lib/setlist-data";

type Filter = Genre | "All" | "Audio";

export default function SetlistPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filtered = MEDLEYS.filter((m) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Audio") return !!m.soundcloudUrl;
    return m.genre === activeFilter;
  });

  function handleFilterClick(filter: Filter) {
    setActiveFilter(filter);
    setExpandedIndex(null);
  }

  function toggleMedley(index: number) {
    setExpandedIndex(expandedIndex === index ? null : index);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-[680px] mx-auto px-6 pt-12 pb-16 flex-1 w-full">
        {/* Header */}
        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logos/lme-typo-white.png"
            alt="LME — Live Music Enhancers"
            className="h-12 mx-auto mb-6"
          />
          <h1 className="font-display text-[3.2rem] text-lme-white tracking-[0.12em] leading-none mb-2">
            SET LIST
          </h1>
          <p className="font-mono text-[0.8rem] text-teal-primary tracking-[0.25em] uppercase mb-6">
            WE WANT TO PARTY.
          </p>
          <p className="text-[0.95rem] text-muted max-w-[540px] mx-auto leading-relaxed">
            {MEDLEYS.length} booking-ready medleys — browse by vibe, listen to
            samples.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap justify-center mb-8">
          <button
            onClick={() => handleFilterClick("All")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeFilter === "All"
                ? "bg-teal-primary text-lme-black"
                : "bg-card border border-border text-body hover:border-teal-primary"
            }`}
          >
            All ({MEDLEYS.length})
          </button>
          {GENRES.map((genre) => {
            const count = MEDLEYS.filter((m) => m.genre === genre).length;
            if (count === 0) return null;
            return (
              <button
                key={genre}
                onClick={() => handleFilterClick(genre)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeFilter === genre
                    ? "bg-teal-primary text-lme-black"
                    : "bg-card border border-border text-body hover:border-teal-primary"
                }`}
              >
                {genre}
              </button>
            );
          })}
          <button
            onClick={() => handleFilterClick("Audio")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeFilter === "Audio"
                ? "bg-teal-primary text-lme-black"
                : "bg-card border border-teal-primary text-teal-primary hover:bg-teal-primary/10"
            }`}
          >
            🎧 Has Audio
          </button>
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {filtered.map((medley, i) => {
            const isExpanded = expandedIndex === i;
            const accentColour = GENRE_COLOURS[medley.genre];

            return (
              <div
                key={medley.name}
                className={`rounded-lg overflow-hidden border transition-colors ${
                  isExpanded
                    ? "border-teal-primary"
                    : "border-border"
                }`}
              >
                {/* Header */}
                <button
                  onClick={() => toggleMedley(i)}
                  className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors ${
                    isExpanded ? "bg-[#0d1f1d]" : "bg-dark-surface hover:bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-8 rounded-sm shrink-0"
                      style={{ backgroundColor: accentColour }}
                    />
                    <div>
                      <div className="font-semibold text-sm text-lme-white">
                        {medley.name}
                        {medley.soundcloudUrl && (
                          <span className="ml-2 text-teal-primary text-xs">
                            🎧
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        {medley.songs.length} tracks · {medley.genre}
                      </div>
                    </div>
                  </div>
                  <span className="text-muted text-sm shrink-0 ml-2">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </button>

                {/* Expanded content */}
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className={`px-4 py-3 bg-[#0a0a0a] ${isExpanded ? "border-t border-border/50" : ""}`}>
                      {/* SoundCloud player */}
                      {medley.soundcloudUrl && (
                        <div className="mb-3">
                          <iframe
                            width="100%"
                            height="20"
                            scrolling="no"
                            frameBorder="no"
                            allow="autoplay"
                            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(medley.soundcloudUrl)}&color=%2314B8A6&inverse=true&auto_play=false&show_user=false`}
                            title={`${medley.name} on SoundCloud`}
                            className="rounded"
                          />
                          <a
                            href={medley.soundcloudUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-xs text-teal-primary hover:underline"
                          >
                            Open in SoundCloud ↗
                          </a>
                        </div>
                      )}

                      {/* Track list */}
                      <div className="divide-y divide-border/30">
                        {medley.songs.map((song, j) => (
                          <div
                            key={`${song.title}-${j}`}
                            className="flex justify-between py-1.5 text-xs"
                          >
                            <span className="text-lme-white">
                              {song.title}
                            </span>
                            <span className="text-muted text-right ml-4 shrink-0">
                              {song.artist}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Footer */}
        <div className="text-center mt-12 pt-10 border-t border-border">
          <p className="text-sm text-muted mb-4">
            Want a tailored set for your event?
          </p>
          <Link
            href="/bookingform"
            className="inline-block px-8 py-3 bg-teal-primary text-lme-black rounded-md font-bold text-sm hover:bg-teal-glow transition-colors"
          >
            Book LME →
          </Link>
        </div>
      </div>

      <footer className="text-center py-12 font-mono text-[0.7rem] text-muted tracking-[0.1em]">
        &copy; 2026 LME &mdash; Live Music Enhancers | lmeband.com
      </footer>
    </div>
  );
}
