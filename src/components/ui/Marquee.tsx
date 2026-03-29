import { CREDITS } from "@/lib/constants";

export default function Marquee() {
  return (
    <div className="absolute bottom-0 left-0 right-0 border-t border-border overflow-hidden bg-lme-black/60 backdrop-blur-sm">
      <div className="flex animate-marquee whitespace-nowrap py-3">
        {[0, 1].map((i) => (
          <span
            key={i}
            className="font-mono text-xs uppercase tracking-[0.3em] text-teal-primary mx-8"
          >
            {CREDITS}
            <span className="mx-8">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
