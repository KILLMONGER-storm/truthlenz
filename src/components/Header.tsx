import { Link, useNavigate } from 'react-router-dom';
import CinematicThemeSwitcher from '@/components/ui/cinematic-theme-switcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { LogOut, Info, HelpCircle, Shield, Zap, Search, BarChart3, Globe, Lock } from 'lucide-react';
import truthLenzLogo from '@/assets/truthlenz-logo-v2.png';

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
          <Dialog>
            <DialogTrigger asChild>
              <button className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors outline-none">
                <HelpCircle className="w-4 h-4" />
                How It Works
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-md border-primary/20">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="w-6 h-6 text-primary" />
                  How TruthLenz Works
                </DialogTitle>
                <DialogDescription className="text-base pt-2">
                  Our multi-layered AI analysis system ensures you get the most accurate verification in seconds.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">1. Input Analysis</h4>
                    <p className="text-sm text-muted-foreground">Our AI breaks down text into verifiable claims and identifies semantic patterns associated with misinformation.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">2. Media Forensics</h4>
                    <p className="text-sm text-muted-foreground">Advanced convolutional neural networks scan images and videos for pixel-level manipulations and AI generation signatures.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">3. Global Cross-Referencing</h4>
                    <p className="text-sm text-muted-foreground">Claims are cross-checked in real-time against a federated network of trusted fact-checking databases and primary sources.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">4. Credibility Verdict</h4>
                    <p className="text-sm text-muted-foreground">You receive a comprehensive credibility score, a clear verdict (Reliable, Misleading, or Fake), and a detailed technical explanation.</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <button className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors outline-none">
                <Info className="w-4 h-4" />
                About
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] bg-card/95 backdrop-blur-md border-primary/20">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">About TruthLenz</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-primary">
                    <Shield className="w-4 h-4" />
                    Our Mission
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    In an era of digital noise and sophisticated deception, TruthLenz aims to empower every individual with the truth. We provide state-of-the-art tools to navigate the information landscape with confidence.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/10">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
                    <Lock className="w-4 h-4" />
                    Integrity & Privacy
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We prioritize user privacy above all else. Your verification history is your own, and our analysis is conducted using unbiased, objective AI models that prioritize factual accuracy over narrative.
                  </p>
                </div>
                <p className="text-xs text-center text-muted-foreground italic pt-2">
                  Powered by Advanced Large Language Models & Computer Vision
                </p>
              </div>
            </DialogContent>
          </Dialog>
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
