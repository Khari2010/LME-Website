import type { ReactNode } from "react";

interface ButtonProps {
  href: string;
  children: ReactNode;
}

export default function Button({ href, children }: ButtonProps) {
  return (
    <a
      href={href}
      className="inline-block bg-teal-primary text-lme-black font-display text-xl uppercase tracking-wider px-10 py-4 rounded-sm hover:bg-teal-deep hover:scale-[1.03] transition-all duration-300"
    >
      {children}
    </a>
  );
}
