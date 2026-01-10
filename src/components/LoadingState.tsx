import { useState, useEffect } from 'react';
import ReactorKnob from '@/components/ui/control-knob';

const stages = [
  { progress: 15, label: 'Analyzing content...' },
  { progress: 35, label: 'Cross-checking sources...' },
  { progress: 55, label: 'Verifying claims...' },
  { progress: 75, label: 'Generating report...' },
  { progress: 90, label: 'Finalizing...' },
];

interface LoadingStateProps {
  onComplete?: () => void;
  isDataReady?: boolean;
}

export function LoadingState({ onComplete, isDataReady = false }: LoadingStateProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hasCompletedAnimation, setHasCompletedAnimation] = useState(false);

  // Progress through stages, but stop at the last one (90%) until data is ready
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCurrentStageIndex((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 600);

    return () => clearInterval(stageInterval);
  }, []);

  // Animate progress smoothly toward current stage target
  useEffect(() => {
    const targetProgress = stages[currentStageIndex].progress;
    
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < targetProgress) {
          return Math.min(prev + 1, targetProgress);
        }
        return prev;
      });
    }, 30);

    return () => clearInterval(progressInterval);
  }, [currentStageIndex]);

  // When data is ready, animate to 100%
  useEffect(() => {
    if (isDataReady && progress >= 90 && !hasCompletedAnimation) {
      const completeInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 100) {
            return Math.min(prev + 2, 100);
          }
          return prev;
        });
      }, 20);

      return () => clearInterval(completeInterval);
    }
  }, [isDataReady, progress, hasCompletedAnimation]);

  // Trigger completion when we hit 100%
  useEffect(() => {
    if (progress >= 100 && !hasCompletedAnimation) {
      setHasCompletedAnimation(true);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [progress, hasCompletedAnimation, onComplete]);

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
