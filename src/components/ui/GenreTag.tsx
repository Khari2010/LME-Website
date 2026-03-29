interface GenreTagProps {
  label: string;
}

export default function GenreTag({ label }: GenreTagProps) {
  return (
    <span className="inline-block border border-teal-primary/40 text-teal-glow font-mono text-xs uppercase tracking-[0.15em] px-4 py-1.5 rounded-full">
      {label}
    </span>
  );
}
