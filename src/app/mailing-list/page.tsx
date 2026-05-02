import MailingListForm from "@/components/enhancers/MailingListForm";

export const metadata = {
  title: "Join the LME mailing list",
  description:
    "Get on the LME mailing list — first to know about gigs, new music, and Enhancer-only content from Live Music Enhancers.",
  openGraph: {
    title: "Join the LME mailing list",
    description:
      "First to know about gigs, new music, and Enhancer-only content.",
    type: "website",
    url: "https://www.lmeband.com/mailing-list",
  },
};

export default function MailingListPage() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-md w-full">
        <header className="text-center mb-10">
          <p className="text-teal-400 uppercase tracking-[0.3em] text-xs">
            Live Music Enhancers
          </p>
          <h1 className="text-white text-4xl md:text-5xl font-bold mt-4 leading-tight">
            Stay in the loop.
          </h1>
          <p className="text-gray-400 mt-4 text-base md:text-lg leading-relaxed">
            Join the mailing list — first to hear about gigs, drops, and
            Enhancer-only content.
          </p>
        </header>

        <MailingListForm />

        <p className="text-gray-600 text-xs text-center mt-8">
          One-tap subscribe. Unsubscribe any time.
        </p>
      </div>
    </main>
  );
}
