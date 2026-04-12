import SectionNumber from "@/components/ui/SectionNumber";
import GenreTag from "@/components/ui/GenreTag";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { GENRES } from "@/lib/constants";

export default function About() {
  return (
    <section id="about" className="py-[64px] md:py-[120px] px-6">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <SectionNumber number="01" label="ABOUT" />
        </RevealOnScroll>

        {/* Asymmetric split */}
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8 md:gap-12 mt-4">
          <RevealOnScroll>
            <h2 className="font-display text-5xl md:text-7xl lg:text-8xl uppercase tracking-wider leading-[0.95]">
              THE ENERGY
              <br />
              IS{" "}
              <span className="text-teal-primary">DIFFERENT</span>
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delay={150}>
            <p className="font-body text-body text-base md:text-lg leading-relaxed max-w-lg">
              LME is a five-piece live band out of Birmingham blending
              Dancehall, RnB, Afrobeats, Pop, Gospel, Disco, and Soca into one
              energy. We don&apos;t do dead vibes. Whether it&apos;s a headline
              show, a wedding, a brand launch, or a private function — we bring
              the heat every time. Live &amp; direct, Birmingham to everywhere.
            </p>
          </RevealOnScroll>
        </div>

        {/* Genre tags */}
        <RevealOnScroll delay={300}>
          <div className="flex flex-wrap gap-3 mt-12">
            {GENRES.map((genre) => (
              <GenreTag key={genre} label={genre} />
            ))}
          </div>
        </RevealOnScroll>

        {/* Band photo */}
        <RevealOnScroll delay={200} className="mt-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/band/amb09969.jpeg"
            alt="LME band members"
            loading="lazy"
            className="w-full max-w-4xl rounded-lg object-cover object-[center_30%] aspect-[16/10]"
          />
        </RevealOnScroll>
      </div>
    </section>
  );
}
