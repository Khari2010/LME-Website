import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LME — Set List",
  description:
    "Browse LME's booking-ready medleys — Dancehall, RnB, Afrobeats, Soca, Throwbacks, Reggae, Gospel. Listen to samples and book your event.",
  openGraph: {
    title: "LME — Set List",
    description:
      "Browse LME's booking-ready medleys. Dancehall, RnB, Afrobeats, Soca, and more.",
    type: "website",
    url: "https://lmeband.com/setlist",
    images: ["/images/band/dsc01991.jpg"],
  },
};

export default function SetlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
