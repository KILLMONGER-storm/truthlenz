import type { TextAnalysis, VerdictType } from '@/types/verification';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { VerdictGlowCard } from '@/components/ui/verdict-glow-card';

interface TextAnalysisCardProps {
  analysis: TextAnalysis;
  verdict: VerdictType;
  score?: number;
}

export function TextAnalysisCard({ analysis, verdict, score }: TextAnalysisCardProps) {
  const sensationalLanguage = analysis.sensationalLanguage || [];
  const emotionalPatterns = analysis.emotionalPatterns || [];
  const reasons = analysis.reasons || [];

  const hasIssues = sensationalLanguage.length > 0 || emotionalPatterns.length > 0;

  return (
    <VerdictGlowCard verdict={verdict} score={score}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Text Analysis</h3>
      </div>

      <div className="space-y-4">
        {/* Reasons */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Key Findings</h4>
          <ul className="space-y-2">
            {reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2">
                {hasIssues ? (
                  <AlertCircle className="w-4 h-4 text-misleading shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-reliable shrink-0 mt-0.5" />
                )}
                <span className="text-sm">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Detected Patterns */}
        {sensationalLanguage.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Sensational Language Detected
            </h4>
            <div className="flex flex-wrap gap-2">
              {sensationalLanguage.map((word, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-misleading-bg text-misleading text-xs font-medium rounded-full"
                >
                  "{word}"
                </span>
              ))}
            </div>
          </div>
        )}

        {emotionalPatterns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Emotional Manipulation Detected
            </h4>
            <div className="flex flex-wrap gap-2">
              {emotionalPatterns.map((word, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-fake-bg text-fake text-xs font-medium rounded-full"
                >
                  "{word}"
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </VerdictGlowCard>
  );
}
