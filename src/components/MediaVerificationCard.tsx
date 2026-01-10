import type { MediaVerification } from '@/types/verification';
import { Image, AlertTriangle, CheckCircle, Clock, Wand2 } from 'lucide-react';

interface MediaVerificationCardProps {
  verification: MediaVerification;
}

export function MediaVerificationCard({ verification }: MediaVerificationCardProps) {
  const hasIssues = verification.isReused || verification.manipulationDetected || !verification.matchesClaim;
  
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Image className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Media Verification</h3>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Description */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Content Description</h4>
          <p className="text-sm bg-muted/50 p-3 rounded-lg">
            {verification.description}
          </p>
        </div>
        
        {/* Status Indicators */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Analysis Results</h4>
          
          {/* Reused Check */}
          <div className="flex items-center gap-3">
            <Clock className={`w-4 h-4 ${verification.isReused ? 'text-misleading' : 'text-reliable'}`} />
            <span className="text-sm">
              {verification.isReused ? (
                <>
                  <span className="text-misleading font-medium">Potentially reused</span>
                  {verification.reusedFrom && (
                    <span className="text-muted-foreground"> — {verification.reusedFrom}</span>
                  )}
                </>
              ) : (
                <span className="text-reliable">No reuse detected</span>
              )}
            </span>
          </div>
          
          {/* Manipulation Check */}
          <div className="flex items-center gap-3">
            <Wand2 className={`w-4 h-4 ${verification.manipulationDetected ? 'text-fake' : 'text-reliable'}`} />
            <span className="text-sm">
              {verification.manipulationDetected ? (
                <span className="text-fake font-medium">Signs of manipulation detected</span>
              ) : (
                <span className="text-reliable">No manipulation detected</span>
              )}
            </span>
          </div>
          
          {/* Claim Match Check */}
          <div className="flex items-center gap-3">
            {verification.matchesClaim ? (
              <CheckCircle className="w-4 h-4 text-reliable" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-misleading" />
            )}
            <span className="text-sm">
              {verification.matchesClaim ? (
                <span className="text-reliable">Media supports the claim</span>
              ) : (
                <span className="text-misleading font-medium">Media may not match claim</span>
              )}
            </span>
          </div>
        </div>
      </div>
      
      {/* Flags */}
      {verification.flags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Warnings</h4>
          <div className="flex flex-wrap gap-2">
            {verification.flags.map((flag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-misleading-bg text-misleading text-xs font-medium rounded-full"
              >
                <AlertTriangle className="w-3 h-3" />
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
