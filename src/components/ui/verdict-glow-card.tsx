import { cn } from "@/lib/utils";
import { GlowEffect, GLOW_COLORS } from "@/components/ui/glow-effect";
import type { VerdictType } from "@/types/verification";

interface VerdictGlowCardProps {
  children: React.ReactNode;
  className?: string;
  verdict: VerdictType;
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

export function VerdictGlowCard({ children, className, verdict }: VerdictGlowCardProps) {
  const colors = getGlowColorsForVerdict(verdict);
  
  return (
    <div className={cn("relative rounded-2xl overflow-hidden", className)}>
      {/* Animated glow effect based on verdict */}
      <GlowEffect
        colors={colors}
        mode="rotate"
        blur="strong"
        scale={1.02}
        duration={6}
        className="opacity-60"
      />
      
      {/* Card content */}
      <div className="relative glass-card rounded-2xl p-6 h-full z-10 border border-border/50">
        {children}
      </div>
    </div>
  );
}
