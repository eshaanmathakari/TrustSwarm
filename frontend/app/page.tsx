import Hero from '@/components/Hero';
import StatsPanel from '@/components/StatsPanel';
import About from '@/components/About';
import Footer from '@/components/Footer';
import Applications from '@/components/applications';
import Architecture from '@/components/architecture';
import CTA from '@/components/cta';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <div id="stats">
        <StatsPanel />
      </div>
      <div id="applications">
        <Applications />
      </div>
      <div id="architecture">
        <Architecture />
      </div>
      <div id="cta">
        <CTA />
      </div>
      <div id="about">
        <About />
      </div>
      <Footer />
    </main>
  );
} 