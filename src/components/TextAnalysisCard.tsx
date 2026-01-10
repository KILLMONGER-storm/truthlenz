import type { TextAnalysis } from '@/types/verification';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface TextAnalysisCardProps {
  analysis: TextAnalysis;
}

export function TextAnalysisCard({ analysis }: TextAnalysisCardProps) {
  const hasIssues = analysis.sensationalLanguage.length > 0 || analysis.emotionalPatterns.length > 0;
  
  return (
    <div className="glass-card rounded-2xl p-6 h-full">
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
            {analysis.reasons.map((reason, index) => (
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
        {analysis.sensationalLanguage.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Sensational Language Detected
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.sensationalLanguage.map((word, index) => (
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
        
        {analysis.emotionalPatterns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Emotional Manipulation Detected
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.emotionalPatterns.map((word, index) => (
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
    </div>
  );
}
