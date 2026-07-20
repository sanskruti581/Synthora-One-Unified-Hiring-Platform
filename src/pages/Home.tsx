import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Stats from "../components/Stats";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-synthora-radial font-inter">
      <div className="pointer-events-none fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.5)_1px,transparent_1.5px)] [background-size:92px_92px]" />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,.07)_48%,transparent_49%)]" />
      </div>
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Footer />
    </main>
  );
}
