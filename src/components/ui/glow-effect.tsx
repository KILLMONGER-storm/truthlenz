'use client';
import { cn } from '@/lib/utils';
import { motion, type Transition, type Easing } from 'motion/react';

export type GlowEffectProps = {
  className?: string;
  style?: React.CSSProperties;
  colors?: string[];
  mode?:
    | 'rotate'
    | 'pulse'
    | 'breathe'
    | 'colorShift'
    | 'flowHorizontal'
    | 'static';
  blur?:
    | number
    | 'softest'
    | 'soft'
    | 'medium'
    | 'strong'
    | 'stronger'
    | 'strongest'
    | 'none';
  transition?: Transition;
  scale?: number;
  duration?: number;
};

export function GlowEffect({
  className,
  style,
  colors = ['#FF5733', '#33FF57', '#3357FF', '#F1C40F'],
  mode = 'rotate',
  blur = 'medium',
  transition,
  scale = 1,
  duration = 5,
}: GlowEffectProps) {
  const BASE_TRANSITION = {
    repeat: Infinity,
    duration: duration,
    ease: 'linear' as Easing,
  };

  const getAnimation = () => {
    switch (mode) {
      case 'rotate':
        return {
          background: [
            `conic-gradient(from 0deg at 50% 50%, ${colors.join(', ')})`,
            `conic-gradient(from 360deg at 50% 50%, ${colors.join(', ')})`,
          ],
          transition: transition ?? BASE_TRANSITION,
        };
      case 'pulse':
        return {
          background: colors.map(
            (color) =>
              `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 100%)`
          ),
          scale: [1 * scale, 1.1 * scale, 1 * scale],
          opacity: [0.5, 0.8, 0.5],
          transition: transition ?? {
            ...BASE_TRANSITION,
            repeatType: 'mirror' as const,
          },
        };
      case 'breathe':
        return {
          background: colors.map(
            (color) =>
              `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 100%)`
          ),
          scale: [1 * scale, 1.05 * scale, 1 * scale],
          transition: transition ?? {
            ...BASE_TRANSITION,
            repeatType: 'mirror' as const,
          },
        };
      case 'colorShift':
        return {
          background: colors.map((color, index) => {
            const nextColor = colors[(index + 1) % colors.length];
            return `conic-gradient(from 0deg at 50% 50%, ${color} 0%, ${nextColor} 50%, ${color} 100%)`;
          }),
          transition: transition ?? {
            ...BASE_TRANSITION,
            repeatType: 'mirror' as const,
          },
        };
      case 'flowHorizontal':
        return {
          background: colors.map((color) => {
            const nextColor = colors[(colors.indexOf(color) + 1) % colors.length];
            return `linear-gradient(to right, ${color}, ${nextColor})`;
          }),
          transition: transition ?? {
            ...BASE_TRANSITION,
            repeatType: 'mirror' as const,
          },
        };
      case 'static':
      default:
        return {
          background: `linear-gradient(to right, ${colors.join(', ')})`,
        };
    }
  };

  const getBlurClass = (blurValue: GlowEffectProps['blur']) => {
    if (typeof blurValue === 'number') {
      return `blur-[${blurValue}px]`;
    }

    const presets = {
      softest: 'blur-sm',
      soft: 'blur',
      medium: 'blur-md',
      strong: 'blur-lg',
      stronger: 'blur-xl',
      strongest: 'blur-xl',
      none: 'blur-none',
    };

    return presets[blurValue as keyof typeof presets];
  };

  return (
    <motion.div
      style={
        {
          ...style,
          '--scale': scale,
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        } as React.CSSProperties
      }
      animate={getAnimation()}
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full',
        'scale-[var(--scale)] transform-gpu',
        getBlurClass(blur),
        className
      )}
    />
  );
}

// Preset color palettes for verdict-based glowing
export const GLOW_COLORS = {
  fake: ['#FF4444', '#FF6B35', '#F97316', '#FBBF24', '#DC2626'],
  misleading: ['#F97316', '#FBBF24', '#EAB308', '#FB923C', '#FCD34D'],
  credible: ['#10B981', '#06B6D4', '#3B82F6', '#22C55E', '#14B8A6'],
  unverified: ['#6B7280', '#9CA3AF', '#A1A1AA', '#78716C', '#71717A'],
} as const;

export type VerdictGlowType = keyof typeof GLOW_COLORS;
