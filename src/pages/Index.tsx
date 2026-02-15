import { useState } from 'react';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { InputSection } from '@/components/InputSection';
import { ResultsSection } from '@/components/ResultsSection';
import { LoadingState } from '@/components/LoadingState';
import { InfiniteGrid } from '@/components/ui/the-infinite-grid';
import { verifyContent, submitFeedback } from '@/lib/verificationApi';
import { verifyContent as mockVerifyContent } from '@/lib/mockVerification';
import { useDemoMode } from '@/hooks/useDemoMode';
import type { VerificationInput, VerificationResult, UserFeedback, VerdictType } from '@/types/verification';
import { useNavigate } from 'react-router-dom';

import { useModelManagement } from '@/hooks/useModelManagement';

import { Alert, AlertTitle, AlertDescription, AlertContent } from '@/components/ui/alert-v2';
import { ShieldAlert, TriangleAlert, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<{ code: string; message: string; variant: 'error' | 'warning' | 'info' } | null>(null);
  const [currentImageBase64, setCurrentImageBase64] = useState<string | undefined>();
  const [feedbackHistory, setFeedbackHistory] = useState<UserFeedback[]>();
  const { isDemoMode } = useDemoMode();
  const { models, selectedModelId, setSelectedModelId, markModelAsExhausted } = useModelManagement();

  const handleVerify = async (input: VerificationInput) => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setCurrentImageBase64(undefined);

    try {
      // Store image base64 for potential feedback submission
      if (input.file && input.type === 'image') {
        const reader = new FileReader();
        reader.onload = () => setCurrentImageBase64(reader.result as string);
        reader.readAsDataURL(input.file);
      }

      // PASS-THROUGH SIMULATION FOR TESTING
      if (input.content.trim() === 'error_429') {
        throw new Error('MOCK_RATE_LIMIT');
      }
      if (input.content.trim() === 'error_500') {
        throw new Error('MOCK_SYSTEM_FAILURE');
      }

      // Pass the selected model ID
      const verificationInput = { ...input, modelId: selectedModelId };

      // Use mock verification in demo mode, real API otherwise
      const verificationResult = isDemoMode
        ? await mockVerifyContent(verificationInput)
        : await verifyContent(verificationInput);

      setResult(verificationResult);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Verification error:', err);
      if (err.message === 'RATE_LIMIT_EXHAUSTED' || err.message === 'MOCK_RATE_LIMIT') {
        if (err.message === 'RATE_LIMIT_EXHAUSTED') {
          markModelAsExhausted(selectedModelId);
          // Redirect to high-impact error page for quota exhaustion
          navigate(`/error/429?message=QUOTA%20REACHED&desc=This%20sensor%20is%20currently%20at%20capacity.%20We%20have%20automatically%20logged%20this%20event%20for%20forensic%20review.`);
        } else {
          setError({
            code: '429',
            message: 'This server is currently at capacity. We have automatically swapped sensors to keep you protected.',
            variant: 'warning'
          });
        }
      } else {
        setError({
          code: '500',
          message: err.message === 'MOCK_SYSTEM_FAILURE'
            ? 'The verification engine encountered an unexpected error. Please try another server.'
            : (err.message || 'An unexpected error occurred.'),
          variant: 'error'
        });
      }
      setIsLoading(false);
    }
  };

  const handleNewVerification = () => {
    setResult(null);
    setError(null);
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
      } catch (error: any) {
        console.error('Failed to submit feedback:', error);
        // Silent error handling for feedback in production - errors are logged but not shown to user
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
        {error && !isLoading && !result && (
          <div className="max-w-3xl mx-auto mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <Alert
              variant={error.variant}
              size="lg"
              layout="complex"
              className="bg-card/40 backdrop-blur-md border-border/50 shadow-2xl"
              icon={error.variant === 'error' ? <ShieldAlert className="w-5 h-5" /> : <TriangleAlert className="w-5 h-5" />}
            >
              <AlertContent className="text-left">
                <AlertTitle className="text-base font-bold tracking-tight uppercase">System Notice: Error {error.code}</AlertTitle>
                <AlertDescription className="text-sm font-medium opacity-90">
                  {error.message}
                </AlertDescription>
                <div className="mt-4 flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setError(null)} className="h-8 gap-2 border-border/50 hover:bg-muted font-semibold">
                    <RefreshCcw className="w-3 h-3" />
                    Reset Sensor
                  </Button>
                  <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Diagnostic Mode Active</span>
                </div>
              </AlertContent>
            </Alert>
          </div>
        )}

        {!result && !isLoading && (
          <>
            <HeroSection />
            <InputSection
              onVerify={handleVerify}
              isLoading={isLoading}
              models={models}
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
            />
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
