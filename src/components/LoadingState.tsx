import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

export function LoadingState() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 300);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-5 w-40" />
      </div>

      {/* Main Score Card Skeleton */}
      <div className="mb-6">
        <div className="rounded-3xl border border-border/50 bg-card/80 backdrop-blur-md p-6">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Score circle skeleton */}
            <Skeleton className="w-32 h-32 rounded-full shrink-0" />
            
            {/* Text content skeleton */}
            <div className="flex-1 space-y-3 w-full">
              <Skeleton className="h-7 w-48 mx-auto lg:mx-0" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Cards Grid Skeleton */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Text Analysis Card Skeleton */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          </div>
        </div>

        {/* Fact Check Card Skeleton */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <Skeleton className="h-6 w-28" />
          </div>
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Section Skeleton */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md p-6">
        <div className="flex items-center justify-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}
