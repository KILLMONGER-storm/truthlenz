import { Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="w-full max-w-md mx-auto text-center py-20 animate-fade-in">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-muted" />
          <Loader2 className="w-16 h-16 absolute inset-0 text-primary animate-spin" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Analyzing Content</h3>
          <p className="text-sm text-muted-foreground">
            Verifying claims and checking sources...
          </p>
        </div>
      </div>
    </div>
  );
}
