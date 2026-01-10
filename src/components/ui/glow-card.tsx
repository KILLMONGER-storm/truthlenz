import { cn } from "@/lib/utils";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlowCard({ children, className }: GlowCardProps) {
  return (
    <div className={cn("relative rounded-2xl", className)}>
      <GlowingEffect
        spread={40}
        glow={true}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={2}
      />
      <div className="relative glass-card rounded-2xl p-6 h-full">
        {children}
      </div>
    </div>
  );
}
