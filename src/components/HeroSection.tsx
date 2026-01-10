import { Shield, Zap, Eye, Lock } from 'lucide-react';

export function HeroSection() {
  return (
    <div className="text-center mb-12">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
        <Zap className="w-4 h-4" />
        AI-Powered Verification
      </div>
      
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
        Detect Misinformation
        <span className="block text-primary">Before It Spreads</span>
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
        Verify news articles, social media posts, images, and videos with our advanced AI. 
        Get instant credibility scores and detailed explanations.
      </p>
      
      {/* Features */}
      <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <span>Text & Media Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span>Fact Verification</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <span>Privacy First</span>
        </div>
      </div>
    </div>
  );
}
