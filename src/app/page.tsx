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

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Listen />
        <Watch />
        <StatementBreak />
        <Gallery />
        <Events />
        <Book />
      </main>
      <Footer />
    </>
  );
}
