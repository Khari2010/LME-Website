import SectionNumber from "@/components/ui/SectionNumber";
import VideoCard from "@/components/ui/VideoCard";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import { VIDEOS } from "@/lib/constants";

export default function Watch() {
  return (
    <section id="watch" className="py-[64px] md:py-[120px] px-6">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <SectionNumber number="03" label="WATCH" />
        </RevealOnScroll>

        <RevealOnScroll>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl uppercase tracking-wider mb-12">
            SEE THE ENERGY{" "}
            <span className="text-teal-primary">LIVE</span>
          </h2>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VIDEOS.map((video, i) => (
            <RevealOnScroll key={video.videoId} delay={i * 100}>
              <VideoCard title={video.title} videoId={video.videoId} />
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
