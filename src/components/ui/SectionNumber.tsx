interface SectionNumberProps {
  number: string;
  label: string;
}

export default function SectionNumber({ number, label }: SectionNumberProps) {
  return (
    <div className="mb-8">
      <span className="font-mono text-5xl font-bold text-teal-glow tracking-wide">
        {number}
      </span>
      <span className="ml-4 font-mono text-xs uppercase tracking-[0.3em] text-teal-primary align-top">
        {label}
      </span>
    </div>
  );
}
