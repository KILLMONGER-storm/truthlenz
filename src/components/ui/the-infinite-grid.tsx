import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { 
  motion, 
  useMotionValue, 
  useTransform, 
  useMotionTemplate, 
  useAnimationFrame 
} from "framer-motion";
import { useTheme } from "next-themes";

interface InfiniteGridProps {
  className?: string;
  children?: React.ReactNode;
  showContent?: boolean;
}

export const InfiniteGrid = ({ className, children, showContent = false }: InfiniteGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  const speedX = 0.3; 
  const speedY = 0.3;

  useAnimationFrame(() => {
    const currentX = gridOffsetX.get();
    const currentY = gridOffsetY.get();
    gridOffsetX.set((currentX + speedX) % 40);
    gridOffsetY.set((currentY + speedY) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "relative w-full h-full overflow-hidden",
        className
      )}
    >
      {/* Base Grid - Static subtle pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <GridPattern 
          offsetX={gridOffsetX} 
          offsetY={gridOffsetY}
          isDark={isDark}
          opacity={isDark ? 0.15 : 0.08}
        />
      </div>

      {/* Active Grid - Revealed on mouse hover */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern 
          offsetX={gridOffsetX} 
          offsetY={gridOffsetY}
          isDark={isDark}
          opacity={isDark ? 0.6 : 0.4}
          isActive
        />
      </motion.div>

      {/* Gradient overlays for depth */}
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        isDark 
          ? "bg-gradient-to-b from-background/0 via-background/50 to-background" 
          : "bg-gradient-to-b from-background/0 via-background/30 to-background"
      )} />
      
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        isDark 
          ? "bg-gradient-to-r from-background via-transparent to-background" 
          : "bg-gradient-to-r from-background/50 via-transparent to-background/50"
      )} />

      {/* Radial glow effect */}
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        isDark
          ? "bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.1)_0%,transparent_70%)]"
          : "bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.05)_0%,transparent_70%)]"
      )} />

      {/* Content */}
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
};

interface GridPatternProps {
  offsetX: any;
  offsetY: any;
  isDark: boolean;
  opacity?: number;
  isActive?: boolean;
}

const GridPattern = ({ offsetX, offsetY, isDark, opacity = 0.2, isActive = false }: GridPatternProps) => {
  const patternTransform = useTransform(
    [offsetX, offsetY],
    ([x, y]) => `translate(${x}px, ${y}px)`
  );

  // Theme-aware colors
  const strokeColor = isDark 
    ? isActive 
      ? "rgba(147, 197, 253, 0.8)" // Light blue for dark mode active
      : "rgba(148, 163, 184, 0.5)" // Slate for dark mode base
    : isActive 
      ? "rgba(59, 130, 246, 0.6)" // Blue for light mode active
      : "rgba(148, 163, 184, 0.4)"; // Slate for light mode base

  const glowColor = isDark
    ? "rgba(147, 197, 253, 0.3)"
    : "rgba(59, 130, 246, 0.2)";

  return (
    <motion.svg 
      className="absolute inset-0 w-full h-full"
      style={{ opacity }}
    >
      <defs>
        <pattern 
          id={`grid-pattern-${isActive ? 'active' : 'base'}-${isDark ? 'dark' : 'light'}`}
          width="40" 
          height="40" 
          patternUnits="userSpaceOnUse"
        >
          <motion.g style={{ transform: patternTransform }}>
            <path 
              d="M 40 0 L 0 0 0 40" 
              fill="none" 
              stroke={strokeColor}
              strokeWidth={isActive ? 1.5 : 1}
            />
            {isActive && (
              <>
                {/* Intersection dots for active grid */}
                <circle cx="0" cy="0" r="2" fill={glowColor} />
                <circle cx="40" cy="0" r="2" fill={glowColor} />
                <circle cx="0" cy="40" r="2" fill={glowColor} />
                <circle cx="40" cy="40" r="2" fill={glowColor} />
              </>
            )}
          </motion.g>
        </pattern>
        {isActive && (
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        )}
      </defs>
      <rect 
        width="100%" 
        height="100%" 
        fill={`url(#grid-pattern-${isActive ? 'active' : 'base'}-${isDark ? 'dark' : 'light'})`}
        filter={isActive ? "url(#glow)" : undefined}
      />
    </motion.svg>
  );
};

export default InfiniteGrid;
