interface SocialLinkProps {
  label: string;
  href: string;
}

export default function SocialLink({ label, href }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-sm uppercase tracking-[0.2em] text-muted hover:text-teal-primary transition-colors duration-300"
    >
      {label}
    </a>
  );
}
