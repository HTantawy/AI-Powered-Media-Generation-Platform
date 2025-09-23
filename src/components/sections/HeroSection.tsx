import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Zap } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

export const HeroSection = () => {
  const handleScrollToGenerator = () => {
    const target = document.getElementById('try-api');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollToShowcase = () => {
    const target = document.getElementById('showcase');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/80" />
      
      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="text-center max-w-4xl mx-auto animate-fade-in-up">
          {/* Headline */}
          <h1 className="text-6xl lg:text-7xl font-bold mb-6 gradient-text leading-tight">
            Generative media in the blink of an API
          </h1>
          
          {/* Subtext */}
          <p className="text-xl text-text-muted mb-12 max-w-2xl mx-auto leading-relaxed">
            Create high-quality media through a fast, affordable API. From sub-second image generation to advanced video inference, all powered by custom hardware and renewable energy. No infrastructure or ML expertise needed.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Button className="btn-hero text-lg px-8 py-4" onClick={handleScrollToGenerator}>
              <span>Start Generating</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button className="btn-glass text-lg px-8 py-4" onClick={handleScrollToShowcase}>
              <Play className="mr-2 h-5 w-5" />
              <span>My Custom Gallery</span>
            </Button>
          </div>
          
          {/* Stats removed */}
        </div>
      </div>
    </section>
  );
};
