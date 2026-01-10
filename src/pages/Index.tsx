import { useState } from 'react';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { InputSection } from '@/components/InputSection';
import { ResultsSection } from '@/components/ResultsSection';
import { LoadingState } from '@/components/LoadingState';
import { verifyContent } from '@/lib/mockVerification';
import type { VerificationInput, VerificationResult, UserFeedback } from '@/types/verification';
import { toast } from 'sonner';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<UserFeedback[]>([]);

  const handleVerify = async (input: VerificationInput) => {
    setIsLoading(true);
    setResult(null);
    
    try {
      // Simulate network delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 500));
      const verificationResult = await verifyContent(input);
      setResult(verificationResult);
    } catch (error) {
      toast.error('Verification failed. Please try again.');
      console.error('Verification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewVerification = () => {
    setResult(null);
  };

  const handleFeedback = (isCorrect: boolean) => {
    if (result) {
      const feedback: UserFeedback = {
        resultId: result.id,
        isCorrect,
        timestamp: new Date(),
      };
      setFeedbackHistory(prev => [...prev, feedback]);
      toast.success('Feedback recorded. Thank you!');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-6xl mx-auto px-4 py-12">
        {!result && !isLoading && (
          <>
            <HeroSection />
            <InputSection onVerify={handleVerify} isLoading={isLoading} />
          </>
        )}
        
        {isLoading && <LoadingState />}
        
        {result && !isLoading && (
          <ResultsSection
            result={result}
            onNewVerification={handleNewVerification}
            onFeedback={handleFeedback}
          />
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            TruthGuard uses AI to help identify misinformation. Results are not 100% accurate. 
            Always verify information from multiple trusted sources.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
