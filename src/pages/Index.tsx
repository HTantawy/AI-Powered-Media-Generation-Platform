import { Header } from "@/components/layout/Header";
import { HeroSection } from "@/components/sections/HeroSection";
import { GeneratorSection } from "@/components/sections/GeneratorSection";
import { ShowcaseSection } from "@/components/sections/ShowcaseSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background custom-scroll">
      <Header />
      <main className="relative">
        <HeroSection />
        <GeneratorSection />
        <ShowcaseSection />
      </main>
    </div>
  );
};

export default Index;
