import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { InputSection } from '@/components/InputSection';
import { ResultsSection } from '@/components/ResultsSection';
import { LoadingState } from '@/components/LoadingState';
import { InfiniteGrid } from '@/components/ui/the-infinite-grid';
import { verifyContent, submitFeedback } from '@/lib/verificationApi';
import type { VerificationInput, VerificationResult, UserFeedback, VerdictType } from '@/types/verification';
import { toast } from 'sonner';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [pendingResult, setPendingResult] = useState<VerificationResult | null>(null);
  const [currentImageBase64, setCurrentImageBase64] = useState<string | undefined>();
  const [feedbackHistory, setFeedbackHistory] = useState<UserFeedback[]>();

  const handleLoadingComplete = () => {
    // When loading animation completes, transfer pending result to result
    if (pendingResult) {
      setResult(pendingResult);
      setPendingResult(null);
    }
    setIsLoading(false);
  };

  const handleVerify = async (input: VerificationInput) => {
    setIsLoading(true);
    setResult(null);
    setPendingResult(null);
    setCurrentImageBase64(undefined);
    
    try {
      // Store image base64 for potential feedback submission
      if (input.file && input.type === 'image') {
        const reader = new FileReader();
        reader.onload = () => setCurrentImageBase64(reader.result as string);
        reader.readAsDataURL(input.file);
      }
      
      const verificationResult = await verifyContent(input);
      setPendingResult(verificationResult);
    } catch (error) {
      toast.error('Verification failed. Please try again.');
      console.error('Verification error:', error);
      setIsLoading(false);
    }
  };

  const handleNewVerification = () => {
    setResult(null);
    setPendingResult(null);
    setCurrentImageBase64(undefined);
  };

  const handleFeedback = async (isCorrect: boolean, correction?: string, correctVerdict?: VerdictType) => {
    if (result) {
      const feedback: UserFeedback = {
        resultId: result.id,
        isCorrect,
        correction,
        correctVerdict,
        timestamp: new Date(),
      };
      setFeedbackHistory(prev => [...(prev || []), feedback]);
      
      // Submit feedback to database for AI training
      try {
        await submitFeedback({
          content: result.input.content,
          contentType: result.input.type,
          originalVerdict: result.verdict,
          originalScore: result.credibilityScore,
          isCorrect,
          userCorrection: correction,
          correctVerdict,
          imageBase64: result.input.type === 'image' ? currentImageBase64 : undefined,
        });
        toast.success(isCorrect ? 'Thank you for confirming!' : 'Correction submitted. Our AI will learn from this!');
      } catch (error) {
        console.error('Failed to submit feedback:', error);
        toast.error('Failed to save feedback. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Infinite Grid Background */}
      <div className="fixed inset-0 z-0">
        <InfiniteGrid className="w-full h-full" />
      </div>
      
      <div className="relative z-10">
        <Header />
      </div>
      
      <main className="container max-w-6xl mx-auto px-4 py-12 relative z-10">
        {!result && !isLoading && (
          <>
            <HeroSection />
            <InputSection onVerify={handleVerify} isLoading={isLoading} />
          </>
        )}
        
        {isLoading && <LoadingState onComplete={handleLoadingComplete} isDataReady={!!pendingResult} />}
        
        {result && !isLoading && (
          <ResultsSection
            result={result}
            onNewVerification={handleNewVerification}
            onFeedback={handleFeedback}
          />
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12 relative z-10 bg-background/80 backdrop-blur-sm">
        <div className="container max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            TruthLenz uses AI to help identify misinformation. Results are not 100% accurate. 
            Always verify information from multiple trusted sources.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
