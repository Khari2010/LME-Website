import Marquee from "@/components/ui/Marquee";

export default function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/band/dsc01991.jpg"
        alt="LME performing live"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-lme-black/30 via-lme-black/60 to-lme-black/95" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logos/lme-full-logo-wb.png"
          alt="LME — Live Music Enhancers"
          className="w-[280px] md:w-[400px] lg:w-[500px] mix-blend-screen"
        />

        {/* Tagline */}
        <p className="mt-8 font-mono text-sm md:text-base uppercase tracking-[0.3em] text-teal-glow">
          WE WANT TO PARTY.
        </p>
      </div>

      {/* Credits marquee */}
      <Marquee />
    </section>
  );
}
