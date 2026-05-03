import { ReactNode } from "react";

// Client portal shell. Public host (lmeband.com), no Clerk auth, no admin nav.
// Inline brand colours rather than CRM tokens — this surface is on the public
// host where the CRM theme tokens may collide. Dark by default to match LME
// brand styling.
export default function ClientPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F0]">
      <header className="border-b border-[#252525] py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="font-bold tracking-wide text-lg">LME</div>
          <div className="text-xs text-[#8A8A8A] uppercase tracking-wider">
            Your booking
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">{children}</main>
      <footer className="border-t border-[#252525] py-4 px-6 mt-12">
        <div className="max-w-3xl mx-auto text-xs text-[#8A8A8A] text-center">
          © 2026 Live Music Enhancers Limited · admin@lmeband.com
        </div>
      </footer>
    </div>
  );
}
