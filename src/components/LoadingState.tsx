import { useState, useEffect } from 'react';
import ReactorKnob from '@/components/ui/control-knob';

const stages = [
  { progress: 15, label: 'Analyzing content...' },
  { progress: 40, label: 'Cross-checking sources...' },
  { progress: 65, label: 'Verifying claims...' },
  { progress: 85, label: 'Generating report...' },
  { progress: 100, label: 'Complete!' },
];

interface LoadingStateProps {
  onComplete?: () => void;
}

export function LoadingState({ onComplete }: LoadingStateProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCurrentStageIndex((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 800);

    return () => clearInterval(stageInterval);
  }, []);

  useEffect(() => {
    const targetProgress = stages[currentStageIndex].progress;
    
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < targetProgress) {
          return Math.min(prev + 2, targetProgress);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [currentStageIndex]);

  useEffect(() => {
    if (progress >= 100 && onComplete) {
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  const currentStage = stages[currentStageIndex];

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
