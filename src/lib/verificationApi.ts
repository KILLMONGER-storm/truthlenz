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

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const verifyContent = async (input: VerificationInput): Promise<VerificationResult> => {
  let imageBase64: string | undefined;
  
  // Convert image to base64 if present
  if (input.file && input.type === 'image') {
    try {
      imageBase64 = await fileToBase64(input.file);
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
    }
  }

  const { data, error } = await supabase.functions.invoke<ApiResponse>('verify-content', {
    body: {
      content: input.content,
      type: input.type,
      mediaDescription: input.file?.name,
      imageBase64,
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
