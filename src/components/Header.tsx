import { Link, useNavigate } from 'react-router-dom';
import CinematicThemeSwitcher from '@/components/ui/cinematic-theme-switcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { LogOut } from 'lucide-react';
import truthLenzLogo from '@/assets/truthlenz-logo.jpg';

export function Header() {
  const { user, signOut } = useAuth();
  const { isDemoMode, disableDemoMode } = useDemoMode();
  const navigate = useNavigate();

  const handleExitDemo = () => {
    disableDemoMode();
    navigate('/auth');
  };

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
        
        <nav className="flex items-center gap-4">
          <a href="#" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#" className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors">
            About
          </a>
          <CinematicThemeSwitcher />
          {isDemoMode ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExitDemo}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          ) : user && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
