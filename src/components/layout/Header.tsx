import { Github, BookOpen, MessageSquare } from "lucide-react";
export const Header = () => {
  return (
    <header className="sticky top-0 z-50 glass-card border-b border-white/10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img
              src="/run4.png"
              alt="Runware logo"
              className="h-10 w-10 rounded-lg object-contain"
            />
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold gradient-text">Runware</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <a 
              href="https://runware.ai/docs/en/getting-started/introduction" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              <span>API Docs</span>
            </a>
            <a 
              href="https://github.com/HTantawy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
            
          </nav>

          <div className="hidden md:flex" />
        </div>
      </div>
    </header>
  );
};
