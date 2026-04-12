import SocialLink from "@/components/ui/SocialLink";
import { SOCIALS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-lme-black">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logos/lme-icon-white.png"
            alt="LME"
            className="h-8 w-auto mix-blend-screen"
          />

          {/* Social links */}
          <div className="flex items-center gap-6">
            {SOCIALS.map((social) => (
              <SocialLink
                key={social.label}
                label={social.label}
                href={social.href}
              />
            ))}
          </div>

          {/* Contact & copyright */}
          <div className="text-center md:text-right">
            <a
              href="mailto:info@lmeband.com"
              className="font-mono text-xs tracking-wider text-muted hover:text-teal-primary transition-colors duration-300"
            >
              info@lmeband.com
            </a>
            <p className="font-mono text-xs text-muted/60 mt-2 tracking-wider">
              &copy; 2026 Live Music Enhancers Limited. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
