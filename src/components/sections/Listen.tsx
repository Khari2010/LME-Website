"use client";

import SectionNumber from "@/components/ui/SectionNumber";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { SOUNDCLOUD_EMBED_URL } from "@/lib/constants";

export default function Listen() {
  return (
    <section id="listen" className="py-[64px] md:py-[120px] px-6">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <SectionNumber number="02" label="LISTEN" />
        </RevealOnScroll>

        <RevealOnScroll>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl uppercase tracking-wider mb-12">
            PRESS <span className="text-teal-primary">PLAY</span>
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={150}>
          <div className="bg-card border border-border rounded-xl p-4 max-w-4xl">
            <iframe
              width="100%"
              height="300"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={SOUNDCLOUD_EMBED_URL}
              title="LME on SoundCloud"
            />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
