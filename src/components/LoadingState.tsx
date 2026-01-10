import { useEffect, useRef, useState } from 'react';
import ReactorKnob from '@/components/ui/control-knob';

const stages = [
  { progress: 15, label: 'Analyzing content...' },
  { progress: 35, label: 'Cross-checking sources...' },
  { progress: 55, label: 'Verifying claims...' },
  { progress: 75, label: 'Generating report...' },
  { progress: 90, label: 'Finalizing...' },
];

// Keeps the loader feeling responsive when verification is fast,
// but still provides enough time for the animation to read well.
const MIN_LOADING_MS = 1200;

interface LoadingStateProps {
  onComplete?: () => void;
  isDataReady?: boolean;
}

export function LoadingState({ onComplete, isDataReady = false }: LoadingStateProps) {
  const startedAtRef = useRef<number>(Date.now());

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [readyToComplete, setReadyToComplete] = useState(false);
  const [hasCompletedAnimation, setHasCompletedAnimation] = useState(false);

  // Progress through stages, but stop at the last one (90%) until data is ready
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCurrentStageIndex((prev) => Math.min(prev + 1, stages.length - 1));
    }, 650);

    return () => clearInterval(stageInterval);
  }, []);

  // When data becomes ready, wait until we've shown the loader for a minimum time,
  // then allow the animation to finish to 100%.
  useEffect(() => {
    if (!isDataReady) {
      setReadyToComplete(false);
      return;
    }

    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed >= MIN_LOADING_MS) {
      setReadyToComplete(true);
      return;
    }

    const remaining = MIN_LOADING_MS - elapsed;
    const t = window.setTimeout(() => setReadyToComplete(true), remaining);
    return () => window.clearTimeout(t);
  }, [isDataReady]);

  const stageTarget = stages[currentStageIndex]?.progress ?? 0;
  const targetProgress = readyToComplete ? 100 : Math.min(stageTarget, 90);

  // Animate progress smoothly toward the current target.
  useEffect(() => {
    const step = readyToComplete ? 3 : 1;
    const tickMs = readyToComplete ? 16 : 28;

    const id = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= targetProgress) return prev;
        return Math.min(prev + step, targetProgress);
      });
    }, tickMs);

    return () => window.clearInterval(id);
  }, [targetProgress, readyToComplete]);

  // Trigger completion when we hit 100% AND the data is ready.
  useEffect(() => {
    if (!readyToComplete) return;
    if (progress < 100) return;
    if (hasCompletedAnimation) return;

    setHasCompletedAnimation(true);
    const timer = window.setTimeout(() => onComplete?.(), 150);
    return () => window.clearTimeout(timer);
  }, [readyToComplete, progress, hasCompletedAnimation, onComplete]);

  const currentStage = progress >= 100
    ? { progress: 100, label: 'Complete!' }
    : stages[currentStageIndex];

  return (
    <div className="w-full max-w-md mx-auto text-center py-12 animate-fade-in">
      <ReactorKnob 
        progress={progress} 
        stage={currentStage.label}
        className="mb-12"
      />
      
      <h3 className="text-xl font-semibold mt-8">Verifying Content</h3>
      <p className="text-sm text-muted-foreground mt-2">
        Please wait while we analyze your content...
      </p>
    </div>
  );
}
