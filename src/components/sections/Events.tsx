"use client";

import SectionNumber from "@/components/ui/SectionNumber";
import RevealOnScroll from "@/components/ui/RevealOnScroll";

export default function Events() {
  return (
    <section id="events" className="py-[64px] md:py-[120px] px-6">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <SectionNumber number="04" label="EVENTS" />
        </RevealOnScroll>

        <RevealOnScroll>
          <h2 className="font-display text-6xl md:text-8xl lg:text-9xl uppercase tracking-wider mb-12">
            CATCH US{" "}
            <span className="text-teal-primary">LIVE</span>
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={100}>
          <div className="rounded-xl overflow-hidden">
            <iframe
              frameBorder="0"
              width="100%"
              height="500"
              src="https://www.skiddle.com/embeds/listings-widget/?promoterId=282232&fetchLimit=8&orderBy=date&primaryColour=%2346C3BD&mobileViewType=list&desktopViewType=card"
              title="LME upcoming events on Skiddle"
            />
          </div>
          <p className="mt-3 font-mono text-xs text-muted tracking-wider">
            <a
              href="https://www.skiddle.com/"
              className="text-muted hover:text-teal-primary transition-colors duration-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Events powered by Skiddle
            </a>
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
