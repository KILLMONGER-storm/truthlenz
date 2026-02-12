import { CredibilityScore } from './CredibilityScore';
import { FactCheckCard } from './FactCheckCard';
import { MediaVerificationCard } from './MediaVerificationCard';
import { TextAnalysisCard } from './TextAnalysisCard';
import { FeedbackButtons } from './FeedbackButtons';
import type { VerificationResult, VerdictType } from '@/types/verification';
import { ArrowLeft, Clock, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VerdictGlowCard } from '@/components/ui/verdict-glow-card';
import { SocialShareDialog } from './SocialShareDialog';
import { useState } from 'react';

interface ResultsSectionProps {
  result: VerificationResult;
  onNewVerification: () => void;
  onFeedback: (isCorrect: boolean, correction?: string, correctVerdict?: VerdictType) => void;
}

export function ResultsSection({ result, onNewVerification, onFeedback }: ResultsSectionProps) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onNewVerification}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            New Verification
          </Button>
          <Button
            variant="ghost"
            onClick={() => setIsShareDialogOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Verdict
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {result.timestamp.toLocaleString()}
        </div>
      </div>

      {/* Main Score Card */}
      <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <VerdictGlowCard className="rounded-3xl" verdict={result.verdict} score={result.credibilityScore}>
          <div className="flex flex-col lg:flex-row items-center gap-8 p-2">
            <CredibilityScore score={result.credibilityScore} verdict={result.verdict} size="lg" />

            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-2xl font-bold mb-3">Verification Complete</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {result.explanation}
              </p>
            </div>
          </div>
        </VerdictGlowCard>
      </div>

      {/* Analysis Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <TextAnalysisCard analysis={result.textAnalysis} verdict={result.verdict} score={result.credibilityScore} />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <FactCheckCard claim={result.claimExtraction} verdict={result.verdict} score={result.credibilityScore} />
        </div>

        {result.mediaVerification && (
          <div className="md:col-span-2 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <MediaVerificationCard verification={result.mediaVerification} verdict={result.verdict} score={result.credibilityScore} />
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <FeedbackButtons onFeedback={onFeedback} currentVerdict={result.verdict} />
      </div>

      <SocialShareDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        result={result}
      />
    </div>
  );
}
