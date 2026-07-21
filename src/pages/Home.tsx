import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import AssessmentMarquee from "../components/AssessmentMarquee";
import Stats from "../components/Stats";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-synthora-radial font-inter text-synthora-text">
      <Navbar />
      <Hero />
      <AssessmentMarquee />
      <Stats />
      <Features />
      <HowItWorks />
      <Footer />
    </main>
  );
}
