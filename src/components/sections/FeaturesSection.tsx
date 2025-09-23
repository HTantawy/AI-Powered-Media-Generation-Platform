import { Card } from "@/components/ui/card";
import { 
  Zap, 
  Video, 
  Layers, 
  FileJson, 
  DollarSign, 
  Code2 
} from "lucide-react";

export const FeaturesSection = () => {
  const features = [
    {
      icon: Zap,
      title: "Sub-second Image Generation",
      description: "Generate high-quality images in under a second with our Sonic Inference Engine®. Optimized for speed without compromising quality.",
      highlight: "0.9s average"
    },
    {
      icon: Video,
      title: "Async Video Inference",
      description: "Create stunning video content with advanced AI models. Queue multiple tasks and receive webhooks when ready.",
      highlight: "Coming Soon"
    },
    {
      icon: Layers,
      title: "300K+ Models & BYO",
      description: "Access the largest library of AI models or bring your own custom models. From SDXL to specialized fine-tunes.",
      highlight: "300K+ models"
    },
    {
      icon: FileJson,
      title: "Unified Task Schema",
      description: "Single API endpoint for all operations. Consistent request/response format across image, video, and future modalities.",
      highlight: "One API"
    },
    {
      icon: DollarSign,
      title: "Transparent Cost Per Task",
      description: "Pay only for what you use with clear, predictable pricing. No hidden fees or monthly minimums.",
      highlight: "$0.0013/image"
    },
    {
      icon: Code2,
      title: "Dev-first SDKs",
      description: "Native SDKs for JavaScript, Python, and REST. Built by developers, for developers with TypeScript support.",
      highlight: "JS, Python, REST"
    }
  ];

  return (
    <section className="py-20 bg-background/80">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold gradient-text mb-4">Core Features</h2>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Everything you need to build amazing AI-powered applications
          </p>
        </div>

        {/* Feature cards removed */}

        {/* Pipeline Presets section removed */}
      </div>
    </section>
  );
};
