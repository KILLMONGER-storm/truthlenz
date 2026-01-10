import { cn } from "@/lib/utils";
import { GlowEffect, GLOW_COLORS } from "@/components/ui/glow-effect";
import type { VerdictType } from "@/types/verification";

interface VerdictGlowCardProps {
  children: React.ReactNode;
  className?: string;
  verdict: VerdictType;
  score?: number; // 0-100 credibility score
}

function getGlowColorsForVerdict(verdict: VerdictType): string[] {
  switch (verdict) {
    case 'fake':
      return [...GLOW_COLORS.fake];
    case 'misleading':
      return [...GLOW_COLORS.misleading];
    case 'reliable':
      return [...GLOW_COLORS.credible];
    default:
      return [...GLOW_COLORS.unverified];
  }
}

// Lower scores = faster animation, higher intensity
function getGlowConfig(score: number, verdict: VerdictType) {
  // Normalize score: 0 = most intense, 100 = least intense
  const intensity = 1 - (score / 100);
  
  // Duration: 2s (low score) to 8s (high score)
  const duration = 8 - (intensity * 6);
  
  // Opacity: 0.4 (high score) to 0.85 (low score)
  const opacity = 0.4 + (intensity * 0.45);
  
  // Scale: 1.01 (high score) to 1.04 (low score)
  const scale = 1.01 + (intensity * 0.03);
  
  // Use pulse mode for fake content to draw more attention
  const mode = verdict === 'fake' ? 'pulse' : 'rotate';
  
  return { duration, opacity, scale, mode };
}

export function VerdictGlowCard({ children, className, verdict, score = 50 }: VerdictGlowCardProps) {
  const colors = getGlowColorsForVerdict(verdict);
  const { duration, opacity, scale, mode } = getGlowConfig(score, verdict);
  
  return (
    <div className={cn("relative rounded-2xl overflow-hidden", className)}>
      {/* Animated glow effect based on verdict and score */}
      <GlowEffect
        colors={colors}
        mode={mode as 'rotate' | 'pulse'}
        blur="strong"
        scale={scale}
        duration={duration}
        className={cn(
          "transition-opacity duration-500",
          verdict === 'fake' && "animate-pulse"
        )}
        style={{ opacity }}
      />
      
      {/* Card content */}
      <div className="relative glass-card rounded-2xl p-6 h-full z-10 border border-border/50">
        {children}
      </div>
    </div>
  );
}
