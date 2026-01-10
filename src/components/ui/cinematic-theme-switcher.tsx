'use client';

import { Sun, Moon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

interface Particle {
  id: number;
  delay: number;
  duration: number;
}

export default function CinematicThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const toggleRef = useRef<HTMLButtonElement>(null);
  
  const isDark = mounted && (theme === 'dark' || resolvedTheme === 'dark');

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateParticles = () => {
    const newParticles: Particle[] = [];
    const particleCount = 3;

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        delay: i * 0.1,
        duration: 0.6 + i * 0.1,
      });
    }

    setParticles(newParticles);
    setIsAnimating(true);

    setTimeout(() => {
      setIsAnimating(false);
      setParticles([]);
    }, 1000);
  };

  const handleToggle = () => {
    generateParticles();
    setTheme(isDark ? 'light' : 'dark');
  };

  if (!mounted) {
    return (
      <div className="relative w-16 h-8 rounded-full bg-muted animate-pulse" />
    );
  }

  return (
    <div className="relative">
      {/* SVG Filter for Film Grain Texture */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="grain-light" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise" />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" mode="overlay" />
          </filter>
          
          <filter id="grain-dark" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" result="noise" />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" in2="noise" mode="screen" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" mode="overlay" />
          </filter>
        </defs>
      </svg>

      {/* Pill-shaped track container */}
      <button
        ref={toggleRef}
        onClick={handleToggle}
        className={`
          relative w-16 h-8 rounded-full cursor-pointer
          transition-all duration-500 ease-out
          ${isDark 
            ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]' 
            : 'bg-gradient-to-br from-sky-200 via-sky-300 to-blue-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.15)]'
          }
        `}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {/* Deep inner groove/rim effect */}
        <div className={`
          absolute inset-0.5 rounded-full
          ${isDark 
            ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.3)]' 
            : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(0,0,0,0.1)]'
          }
        `} />

        {/* Multi-layer glossy overlay */}
        <div className={`
          absolute inset-0 rounded-full
          bg-gradient-to-b from-white/20 via-transparent to-transparent
          pointer-events-none
        `} />

        {/* Ambient occlusion effect */}
        <div className={`
          absolute inset-0 rounded-full
          ${isDark 
            ? 'bg-gradient-to-t from-black/20 via-transparent to-transparent' 
            : 'bg-gradient-to-t from-black/10 via-transparent to-transparent'
          }
          pointer-events-none
        `} />

        {/* Background Icons */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
          <Sun className={`w-3.5 h-3.5 transition-opacity duration-300 ${isDark ? 'opacity-30 text-yellow-500/50' : 'opacity-0'}`} />
          <Moon className={`w-3.5 h-3.5 transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-30 text-slate-400/50'}`} />
        </div>

        {/* Circular Thumb with Bouncy Spring Physics */}
        <motion.div
          className={`
            absolute top-1 w-6 h-6 rounded-full
            flex items-center justify-center
            ${isDark 
              ? 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]' 
              : 'bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-400 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.5)]'
            }
          `}
          initial={false}
          animate={{
            x: isDark ? 32 : 4,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        >
          {/* Glossy shine overlay on thumb */}
          <div className={`
            absolute inset-0 rounded-full overflow-hidden
            bg-gradient-to-b from-white/40 via-transparent to-transparent
            pointer-events-none
          `} />

          {/* Particle Layer */}
          {isAnimating && particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute inset-0 rounded-full pointer-events-none"
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            >
              <div className={`
                w-full h-full rounded-full
                ${isDark 
                  ? 'bg-gradient-to-br from-indigo-400/60 via-purple-500/40 to-transparent' 
                  : 'bg-gradient-to-br from-yellow-300/60 via-orange-400/40 to-transparent'
                }
              `}>
                {/* Grainy texture overlay */}
                <div 
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{ filter: isDark ? 'url(#grain-dark)' : 'url(#grain-light)' }}
                />
              </div>
            </motion.div>
          ))}

          {/* Icon */}
          <motion.div
            className="relative z-10"
            initial={false}
            animate={{ rotate: isDark ? 0 : 180 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {isDark ? (
              <Moon className="w-3.5 h-3.5 text-slate-200" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-700" />
            )}
          </motion.div>
        </motion.div>
      </button>
    </div>
  );
}
