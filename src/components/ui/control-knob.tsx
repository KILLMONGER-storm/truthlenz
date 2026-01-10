"use client";

import { cn } from "@/lib/utils";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring, useMotionValueEvent } from "framer-motion";

interface ReactorKnobProps {
  progress?: number;
  stage?: string;
  className?: string;
}

export default function ReactorKnob({ progress = 0, stage = "Initializing...", className }: ReactorKnobProps) {
  const MIN_DEG = -135;
  const MAX_DEG = 135;
  const TOTAL_TICKS = 40;

  // Convert progress (0-100) to rotation degrees
  const targetRotation = MIN_DEG + (progress / 100) * (MAX_DEG - MIN_DEG);

  const snappedRotation = useMotionValue(MIN_DEG);
  
  const smoothRotation = useSpring(snappedRotation, { 
    stiffness: 100, 
    damping: 20, 
    mass: 0.5
  });

  // Update rotation when progress changes
  useEffect(() => {
    snappedRotation.set(targetRotation);
  }, [targetRotation, snappedRotation]);

  const displayValue = useTransform(smoothRotation, [MIN_DEG, MAX_DEG], [0, 100]);
  const lightOpacity = useTransform(smoothRotation, [MIN_DEG, MAX_DEG], [0.05, 0.5]);
  const lightBlur = useTransform(smoothRotation, [MIN_DEG, MAX_DEG], ["0px", "20px"]);

  const ticks = Array.from({ length: TOTAL_TICKS + 1 });

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="relative w-64 h-64">
        {/* Background Glow */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary"
          style={{
            opacity: lightOpacity,
            filter: useTransform(lightBlur, (b) => `blur(${b})`),
          }}
        />

        {/* Tick Marks Ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          {ticks.map((_, i) => {
            const angle = (i / TOTAL_TICKS) * (MAX_DEG - MIN_DEG) + MIN_DEG;
            return (
              <div
                key={i}
                className="absolute w-full h-full flex items-center justify-center"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <TickMark currentRotation={smoothRotation} angle={angle} />
              </div>
            );
          })}
        </div>

        {/* The Knob */}
        <div className="absolute inset-8 flex items-center justify-center">
          <motion.div
            className="w-full h-full"
            style={{ rotate: smoothRotation }}
          >
            {/* Knob Body */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.1)] border border-zinc-600">
              {/* Brushed Metal Texture */}
              <div 
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  background: "repeating-conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.03) 1deg, transparent 2deg)"
                }}
              />
              
              {/* Top Cap */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-b from-zinc-600 to-zinc-800 shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center">
                {/* Indicator Line */}
                <motion.div 
                  className="absolute top-3 left-1/2 -translate-x-1/2 w-1 h-4 rounded-full bg-primary"
                  style={{ 
                    boxShadow: useTransform(smoothRotation, (r) => `0 0 ${Math.max(5, (r + 135) / 10)}px hsl(var(--primary))`) 
                  }} 
                />
                
                {/* Stage Label */}
                <div className="mt-8 text-[10px] font-mono text-zinc-400 tracking-widest uppercase text-center px-2 leading-tight">
                  {stage}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Digital Readout */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest">PROGRESS</span>
          <DisplayValue value={displayValue} />
        </div>
      </div>
    </div>
  );
}

function TickMark({ currentRotation, angle }: { currentRotation: any, angle: number }) {
  const opacity = useTransform(currentRotation, (r: number) => {
    return r >= angle ? 1 : 0.2;
  });
  const color = useTransform(currentRotation, (r: number) => {
    return r >= angle ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
  });
  const boxShadow = useTransform(currentRotation, (r: number) => {
    return r >= angle ? "0 0 8px hsl(var(--primary) / 0.6)" : "none";
  });

  return (
    <motion.div
      className="absolute -top-1 w-1 h-3 rounded-full"
      style={{ opacity, backgroundColor: color, boxShadow }}
    />
  );
}

function DisplayValue({ value }: { value: any }) {
  const [display, setDisplay] = useState(0);
  useMotionValueEvent(value, "change", (latest: number) => setDisplay(Math.round(latest)));
  
  return (
    <div className="relative">
      <span className="text-3xl font-mono font-bold text-transparent select-none">
        {display.toString().padStart(3, '0')}
      </span>
      <span className="absolute inset-0 text-3xl font-mono font-bold text-foreground">
        {display.toString().padStart(3, '0')}
        <span className="text-lg text-muted-foreground">%</span>
      </span>
    </div>
  );
}
