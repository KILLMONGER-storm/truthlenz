import { supabase } from '@/integrations/supabase/client';
import type { VerificationInput, VerificationResult, VerdictType, TextAnalysis, ClaimExtraction, MediaVerification } from '@/types/verification';

interface ApiResponse {
  id: string;
  credibilityScore: number;
  verdict: VerdictType;
  textAnalysis: TextAnalysis;
  claimExtraction: ClaimExtraction;
  mediaVerification?: MediaVerification;
  explanation: string;
  timestamp: string;
}

export const verifyContent = async (input: VerificationInput): Promise<VerificationResult> => {
  const { data, error } = await supabase.functions.invoke<ApiResponse>('verify-content', {
    body: {
      content: input.content,
      type: input.type,
      mediaDescription: input.file?.name,
    },
  });

  if (error) {
    console.error('Verification API error:', error);
    throw new Error(error.message || 'Verification failed');
  }

  if (!data) {
    throw new Error('No response from verification service');
  }

  return {
    id: data.id,
    input,
    credibilityScore: data.credibilityScore,
    verdict: data.verdict,
    textAnalysis: data.textAnalysis,
    claimExtraction: data.claimExtraction,
    mediaVerification: data.mediaVerification,
    explanation: data.explanation,
    timestamp: new Date(data.timestamp),
  };
};
