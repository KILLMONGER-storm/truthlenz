"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { animate } from "motion/react";

interface GlowingEffectProps {
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  variant?: "default" | "white";
  glow?: boolean;
  className?: string;
  disabled?: boolean;
  movementDuration?: number;
  borderWidth?: number;
}

const GlowingEffect = memo(
  ({
    blur = 0,
    inactiveZone = 0.7,
    proximity = 0,
    spread = 20,
    variant = "default",
    glow = false,
    className,
    movementDuration = 2,
    borderWidth = 1,
    disabled = false,
  }: GlowingEffectProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastPosition = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number>(0);

    const handleMove = useCallback(
      (e?: MouseEvent | { x: number; y: number }) => {
        if (!containerRef.current) return;

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          const element = containerRef.current;
          if (!element) return;

          const { left, top, width, height } = element.getBoundingClientRect();
          const mouseX = e?.x ?? lastPosition.current.x;
          const mouseY = e?.y ?? lastPosition.current.y;

          if (e) {
            lastPosition.current = { x: mouseX, y: mouseY };
          }

          const center = [left + width * 0.5, top + height * 0.5];
          const distanceFromCenter = Math.hypot(
            mouseX - center[0],
            mouseY - center[1]
          );
          const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

          if (distanceFromCenter < inactiveRadius) {
            element.style.setProperty("--active", "0");
            return;
          }

          const isActive =
            mouseX > left - proximity &&
            mouseX < left + width + proximity &&
            mouseY > top - proximity &&
            mouseY < top + height + proximity;

          element.style.setProperty("--active", isActive ? "1" : "0");

          if (!isActive) return;

          const currentAngle =
            parseFloat(element.style.getPropertyValue("--start")) || 0;
          let targetAngle =
            (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) /
              Math.PI +
            90;

          const angleDiff = ((targetAngle - currentAngle + 180) % 360) - 180;
          const newAngle = currentAngle + angleDiff;

          animate(currentAngle, newAngle, {
            duration: movementDuration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (value) => {
              element.style.setProperty("--start", String(value));
            },
          });
        });
      },
      [inactiveZone, proximity, movementDuration]
    );

    useEffect(() => {
      if (disabled) return;

      const handleScroll = () => handleMove();
      const handlePointerMove = (e: PointerEvent) => handleMove(e);

      window.addEventListener("scroll", handleScroll, { passive: true });
      document.body.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        window.removeEventListener("scroll", handleScroll);
        document.body.removeEventListener("pointermove", handlePointerMove);
      };
    }, [handleMove, disabled]);

    return (
      <>
        <div
          className={cn(
            "pointer-events-none absolute -inset-px rounded-[inherit] border opacity-0 transition-opacity",
            glow && "opacity-100 block",
            variant === "white" && "border-white",
            variant === "default" && "border-primary/50",
            disabled && "!hidden"
          )}
          style={{
            ["--border-width" as string]: `${borderWidth}px`,
          }}
        />
        <div
          ref={containerRef}
          style={{
            ["--blur" as string]: `${blur}px`,
            ["--spread" as string]: spread,
            ["--start" as string]: "0",
            ["--active" as string]: "0",
            ["--glowingeffect-border-width" as string]: `${borderWidth}px`,
            ["--repeating-conic-gradient-times" as string]: "5",
            ["--gradient" as string]:
              variant === "white"
                ? `repeating-conic-gradient(
                    from calc(var(--start) * 1deg),
                    #fff 0%,
                    #fff 5%,
                    transparent 5%,
                    transparent 40%,
                    #fff 50%
                  )`
                : `radial-gradient(ellipse at center, hsl(var(--primary)), transparent, transparent),
                   repeating-conic-gradient(
                    from calc(var(--start) * 1deg),
                    hsl(var(--primary)) 0%,
                    hsl(var(--accent)) 5%,
                    transparent 12.5%,
                    transparent 25%,
                    hsl(var(--secondary)) 50%
                  )`,
          }}
          className={cn(
            "pointer-events-none absolute -inset-px rounded-[inherit] opacity-[var(--active)] transition-opacity duration-500",
            "after:content-[''] after:absolute after:inset-[var(--glowingeffect-border-width)] after:rounded-[inherit] after:bg-background",
            "before:content-[''] before:absolute before:inset-0 before:rounded-[inherit]",
            "before:bg-[var(--gradient)] before:bg-[length:calc(100%+var(--spread)*1px)_calc(100%+var(--spread)*1px)] before:bg-center",
            blur > 0 && "before:blur-[var(--blur)]",
            className,
            disabled && "!hidden"
          )}
        />
      </>
    );
  }
);

GlowingEffect.displayName = "GlowingEffect";

export { GlowingEffect };
