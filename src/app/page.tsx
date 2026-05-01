import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Listen from "@/components/sections/Listen";
import Watch from "@/components/sections/Watch";
import StatementBreak from "@/components/sections/StatementBreak";
import Gallery from "@/components/sections/Gallery";
import Events from "@/components/sections/Events";
import Book from "@/components/sections/Book";
import SignupCard from "@/components/enhancers/SignupCard";
import EnhancersFooterCTA from "@/components/sections/EnhancersFooterCTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <section className="bg-black border-t border-b border-gray-900 px-6 md:px-12 lg:px-24">
          <SignupCard variant="hero" />
        </section>
        <About />
        <Listen />
        <Watch />
        <StatementBreak />
        <Gallery />
        <Events />
        <Book />
        <EnhancersFooterCTA />
      </main>
      <Footer />
    </>
  );
}
