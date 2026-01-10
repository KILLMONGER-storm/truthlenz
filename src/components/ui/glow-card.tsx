import { cn } from "@/lib/utils";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlowCard({ children, className }: GlowCardProps) {
  return (
    <div className={cn("relative h-full rounded-[1.25rem] border border-border/50 p-2 md:rounded-3xl md:p-3", className)}>
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={2}
      />
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-border/30 p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-card/80 backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}
