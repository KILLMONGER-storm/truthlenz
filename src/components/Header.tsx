import { Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Header() {
  return (
    <header className="w-full py-4 px-6 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 hero-gradient rounded-lg">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">TruthLenz</span>
        </div>
        
        <nav className="flex items-center gap-6">
          <a href="#" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
            About
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
