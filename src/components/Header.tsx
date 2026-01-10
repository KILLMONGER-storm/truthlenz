import { Link } from 'react-router-dom';
import CinematicThemeSwitcher from '@/components/ui/cinematic-theme-switcher';
import truthLenzLogo from '@/assets/truthlenz-logo.jpg';

export function Header() {
  return (
    <header className="w-full py-4 px-6 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <img 
            src={truthLenzLogo} 
            alt="TruthLenz Logo" 
            className="h-12 w-auto object-contain rounded-lg"
          />
        </Link>
        
        <nav className="flex items-center gap-6">
          <a href="#" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
            About
          </a>
          <CinematicThemeSwitcher />
        </nav>
      </div>
    </header>
  );
}
