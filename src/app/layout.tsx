import type { Metadata } from "next";
import { Bebas_Neue, Syne, Space_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/lib/convex/ConvexClientProvider";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas-neue",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LME — Live Music Enhancers | We Want To Party",
  description:
    "LME is a five-piece live band out of Birmingham blending Dancehall, RnB, Afrobeats, Pop, Gospel, Disco, and Soca into one energy. We don't do dead vibes.",
  openGraph: {
    title: "LME — Live Music Enhancers",
    description:
      "Five-piece live band out of Birmingham. Dancehall, RnB, Afrobeats, Pop, Gospel, Disco, Soca. We don't do dead vibes.",
    type: "website",
    url: "https://lmeband.com",
    images: ["/images/band/dsc01991.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${syne.variable} ${spaceMono.variable}`}
    >
      <body className="font-body antialiased">
        <ClerkProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
