import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { GALLERY_IMAGES } from "@/lib/constants";

export default function Gallery() {
  return (
    <section className="py-[64px] md:py-[120px] px-6">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <h2 className="font-display text-4xl md:text-6xl uppercase tracking-wider mb-12 text-center">
            THE <span className="text-teal-primary">BAND</span>
          </h2>
        </RevealOnScroll>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {GALLERY_IMAGES.map((image, i) => (
            <RevealOnScroll
              key={image.src}
              delay={i * 50}
              className={
                i === 0 || i === 5
                  ? "row-span-2"
                  : ""
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                className={`w-full object-cover rounded-sm ${
                  i === 0 || i === 5 ? "h-full" : "aspect-square"
                }`}
              />
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
