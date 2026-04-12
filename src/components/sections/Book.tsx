import SectionNumber from "@/components/ui/SectionNumber";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";

export default function Book() {
  return (
    <section id="book" className="py-[64px] md:py-[120px] px-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-teal-dark/40 to-card rounded-2xl p-8 md:p-16 text-center">
          <RevealOnScroll>
            <SectionNumber number="05" label="BOOKINGS" />
          </RevealOnScroll>

          <RevealOnScroll>
            <h2 className="font-display text-6xl md:text-8xl lg:text-9xl uppercase tracking-wider mb-8">
              BRING THE{" "}
              <span className="text-teal-primary">ENERGY</span>
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delay={100}>
            <p className="font-body text-body text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
              We bring the energy to your event. Weddings, private parties,
              brand launches, corporate functions — whatever the occasion, we
              shell it down.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={200}>
            <Button href="mailto:info@lmeband.com">GET IN TOUCH</Button>
            <p className="mt-6 font-mono text-sm text-muted tracking-wider">
              info@lmeband.com
            </p>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
