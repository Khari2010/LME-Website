"use client";

import { useEffect, useRef } from "react";
import SectionNumber from "@/components/ui/SectionNumber";
import RevealOnScroll from "@/components/ui/RevealOnScroll";

export default function Events() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src =
      "https://www.skiddle.com/infofeed/ticketpage.php?ilid=42250618&theme=%7B%22variant%22%3A%22light%22%2C%22primary%22%3A%7B%22main%22%3A%22%2314b8a6%22%7D%2C%22secondary%22%3A%7B%22light%22%3A%22%23ffc106%22%2C%22main%22%3A%22%23f5a622%22%2C%22dark%22%3A%22%23cd8723%22%2C%22contrastText%22%3A%22%23fff%22%7D%2C%22info%22%3A%22%23318200%22%2C%22white%22%3A%7B%22main%22%3A%22%23fff%22%7D%7D;type=embedded";
    containerRef.current.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

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
          <div className="mb-10 max-w-3xl">
            <h3 className="font-display text-3xl md:text-5xl uppercase tracking-wider mb-4">
              FLASHBACK <span className="text-teal-primary">FETE</span>
            </h3>
            <p className="font-body text-body text-base md:text-lg leading-relaxed mb-6">
              A summer day festival headlined by LME — nonstop R&B, Afro &
              Caribbean vibes. DJs, guest artists, food vendors, games, prizes
              and live music. Come shell it down with us.
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-sm text-teal-primary tracking-wider">
              <span>SUN 9 AUG 2026</span>
              <span>3:30 PM — 9:00 PM</span>
              <span>MAMA ROUX&apos;S, BIRMINGHAM</span>
              <span>18+</span>
            </div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={200}>
          <div ref={containerRef} className="rounded-xl overflow-hidden">
            <div id="ticketbox_ph_42250618">
              <p className="font-body text-body">
                To buy tickets for this event please visit our events page:{" "}
                <a
                  href="https://www.skiddle.com/whats-on/Birmingham/Mama-Roux%27s-Birmingham/Flashback-Fete/42250618/"
                  className="text-teal-primary hover:text-teal-glow transition-colors duration-300 font-bold"
                >
                  Flashback Fete tickets from Skiddle
                </a>
              </p>
            </div>
          </div>
          <p className="mt-3 font-mono text-xs text-muted tracking-wider">
            <a
              href="https://www.skiddle.com/"
              className="text-muted hover:text-teal-primary transition-colors duration-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ticket sales powered by Skiddle
            </a>
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
