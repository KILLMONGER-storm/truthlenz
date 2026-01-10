import { CredibilityScore } from './CredibilityScore';
import { FactCheckCard } from './FactCheckCard';
import { MediaVerificationCard } from './MediaVerificationCard';
import { TextAnalysisCard } from './TextAnalysisCard';
import { FeedbackButtons } from './FeedbackButtons';
import type { VerificationResult } from '@/types/verification';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResultsSectionProps {
  result: VerificationResult;
  onNewVerification: () => void;
  onFeedback: (isCorrect: boolean) => void;
}

export function ResultsSection({ result, onNewVerification, onFeedback }: ResultsSectionProps) {
  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={onNewVerification}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          New Verification
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {result.timestamp.toLocaleString()}
        </div>
      </div>
      
      {/* Main Score Card */}
      <div className="glass-card rounded-3xl p-8 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <CredibilityScore score={result.credibilityScore} verdict={result.verdict} size="lg" />
          
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-2xl font-bold mb-3">Verification Complete</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {result.explanation}
            </p>
          </div>
        </div>
      </div>
      
      {/* Analysis Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <TextAnalysisCard analysis={result.textAnalysis} />
        </div>
        
        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <FactCheckCard claim={result.claimExtraction} />
        </div>
        
        {result.mediaVerification && (
          <div className="md:col-span-2 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <MediaVerificationCard verification={result.mediaVerification} />
          </div>
        )}
      </div>
      
      {/* Feedback Section */}
      <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <FeedbackButtons onFeedback={onFeedback} />
      </div>
    </div>
  );
}
