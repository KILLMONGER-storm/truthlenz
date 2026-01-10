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
}

export const InfiniteGrid = ({ className, children }: InfiniteGridProps) => {
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

  const speedX = 0.5; 
  const speedY = 0.5;

  useAnimationFrame(() => {
    const currentX = gridOffsetX.get();
    const currentY = gridOffsetY.get();
    gridOffsetX.set((currentX + speedX) % 40);
    gridOffsetY.set((currentY + speedY) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "relative w-full h-full overflow-hidden",
        isDark ? "bg-neutral-950" : "bg-slate-50",
        className
      )}
    >
      {/* Base Grid Layer - Always visible, more prominent */}
      <div className={cn(
        "absolute inset-0",
        isDark ? "opacity-50" : "opacity-40"
      )}>
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} isDark={isDark} />
      </div>

      {/* Active Grid Layer - Revealed on mouse hover */}
      <motion.div 
        className="absolute inset-0"
        style={{ 
          maskImage, 
          WebkitMaskImage: maskImage 
        }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} isDark={isDark} isActive />
      </motion.div>

      {/* Colorful Gradient Overlays */}
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        isDark 
          ? "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.3),transparent)]" 
          : "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.2),transparent)]"
      )} />

      {/* Primary color accent - top right */}
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        isDark 
          ? "bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.15),transparent_50%)]" 
          : "bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_50%)]"
      )} />

      {/* Secondary color accent - bottom left */}
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        isDark 
          ? "bg-[radial-gradient(circle_at_20%_80%,rgba(6,182,212,0.12),transparent_50%)]" 
          : "bg-[radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.1),transparent_50%)]"
      )} />

      {/* Accent color - center glow */}
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        isDark 
          ? "bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.08),transparent_70%)]" 
          : "bg-[radial-gradient(circle_at_50%_50%,rgba(244,114,182,0.06),transparent_70%)]"
      )} />

      {/* Edge fade for depth */}
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        isDark 
          ? "bg-gradient-to-b from-transparent via-transparent to-neutral-950/80" 
          : "bg-gradient-to-b from-transparent via-transparent to-slate-50/80"
      )} />

      <div className={cn(
        "absolute inset-0 pointer-events-none",
        isDark 
          ? "bg-gradient-to-r from-neutral-950/60 via-transparent to-neutral-950/60" 
          : "bg-gradient-to-r from-slate-50/60 via-transparent to-slate-50/60"
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
  isActive?: boolean;
}

const GridPattern = ({ offsetX, offsetY, isDark, isActive = false }: GridPatternProps) => {
  const patternTransform = useTransform(
    [offsetX, offsetY],
    ([x, y]) => `translate(${x}px, ${y}px)`
  );

  const strokeColor = isDark 
    ? isActive 
      ? "rgba(139, 92, 246, 0.9)"   // Vivid violet for dark active
      : "rgba(255, 255, 255, 0.15)" // Brighter white for dark base
    : isActive 
      ? "rgba(59, 130, 246, 0.8)"   // Vivid blue for light active
      : "rgba(100, 116, 139, 0.2)"; // Slate for light base

  return (
    <svg className="absolute inset-0 w-full h-full">
      <defs>
        <pattern 
          id={`grid-${isActive ? 'active' : 'base'}-${isDark ? 'dark' : 'light'}`}
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
          </motion.g>
        </pattern>
      </defs>
      <rect 
        width="100%" 
        height="100%" 
        fill={`url(#grid-${isActive ? 'active' : 'base'}-${isDark ? 'dark' : 'light'})`}
      />
    </svg>
  );
};

export default InfiniteGrid;
