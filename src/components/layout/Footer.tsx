import { Sparkles, Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="py-12 bg-surface/50 border-t border-white/10">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold gradient-text">Runware</span>
          </div>

          {/* Links */}
          <div className="flex items-center space-x-8 text-sm">
            <a 
              href="https://docs.runware.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              Documentation
            </a>
            <a 
              href="https://runware.ai/pricing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              Pricing
            </a>
            <a 
              href="https://runware.ai/support" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              Support
            </a>
            <a 
              href="https://runware.ai/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              Privacy
            </a>
          </div>

          {/* Attribution */}
          <div className="flex items-center space-x-2 text-text-subtle text-sm">
            <span>Built with</span>
            <Heart className="h-4 w-4 text-accent fill-current" />
            <span>using Runware API</span>
          </div>

          {/* Copyright */}
          <div className="text-text-subtle text-xs">
            © {new Date().getFullYear()} Runware. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};