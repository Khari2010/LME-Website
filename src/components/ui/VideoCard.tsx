interface VideoCardProps {
  title: string;
  videoId: string;
}

export default function VideoCard({ title, videoId }: VideoCardProps) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-card border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-primary/20 transition-all duration-300"
    >
      <div className="relative aspect-video overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-teal-primary/90 rounded-full flex items-center justify-center group-hover:bg-teal-glow/90 transition-colors duration-300">
            <div className="w-0 h-0 border-l-[20px] border-l-lme-black border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
          </div>
        </div>
        {/* Title gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-lme-black/90 to-transparent p-4 pt-12">
          <p className="font-mono text-xs uppercase tracking-wider text-lme-white/90">
            {title}
          </p>
        </div>
      </div>
    </a>
  );
}
