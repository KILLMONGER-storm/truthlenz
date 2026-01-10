import { cn } from "@/lib/utils";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlowCard({ children, className }: GlowCardProps) {
  return (
    <div className={cn("relative rounded-2xl overflow-hidden", className)}>
      <GlowingEffect
        spread={40}
        glow={true}
        proximity={100}
        inactiveZone={0.01}
        borderWidth={3}
        blur={4}
      />
      <div className="relative glass-card rounded-2xl p-6 h-full z-10">
        {children}
      </div>
    </div>
  );
}
