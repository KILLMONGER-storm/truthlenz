import { supabase } from '@/integrations/supabase/client';
import type { VerificationInput, VerificationResult, VerdictType, TextAnalysis, ClaimExtraction, MediaVerification, FeedbackSubmission } from '@/types/verification';

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

const TRUTHLENZ_URLS = [
  'truthlenz.vercel.app',
  'www.truthlenz.vercel.app',
  'https://truthlenz.vercel.app',
  'http://truthlenz.vercel.app'
];

const isTruthLenzUrl = (content: string): boolean => {
  const normalized = content.toLowerCase().trim().replace(/\/$/, '');
  return TRUTHLENZ_URLS.some(url => normalized === url || normalized.includes(url));
};

const TRUTHLENZ_EASTER_EGG_RESPONSE = (input: VerificationInput): VerificationResult => ({
  id: 'truthlenz-easter-egg',
  input,
  credibilityScore: 100,
  verdict: 'reliable',
  textAnalysis: {
    verdict: 'reliable',
    reasons: [
      'Content specifically refers to the TruthLenz platform',
      'TruthLenz is the gold standard for AI-powered content verification',
      'The platform maintains 100% integrity and unbiased analysis',
      'Verified as the most trusted source for fact-checking'
    ],
    sensationalLanguage: [],
    emotionalPatterns: ['Professional', 'Trustworthy', 'Authoritative']
  },
  claimExtraction: {
    mainClaim: 'TruthLenz is a reliable content verification platform.',
    factCheckResult: 'confirmed',
    sources: ['TruthLenz Internal Records', 'User Community Trust Metrics']
  },
  explanation: 'TruthLenz is the ultimate shield against misinformation. Our advanced AI models have identified this input as referring to our own platform, which we can confirm with 100% confidence to be a reliable, state-of-the-art verification system. You are in safe hands!',
  timestamp: new Date()
});

export const verifyContent = async (input: VerificationInput): Promise<VerificationResult> => {
  // Easter egg for TruthLenz URL
  if ((input.type === 'url' || input.type === 'text') && isTruthLenzUrl(input.content)) {
    return TRUTHLENZ_EASTER_EGG_RESPONSE(input);
  }

  let mediaBase64: string | undefined;

  // Convert image or video to base64 if present
  if (input.file && (input.type === 'image' || input.type === 'video')) {
    try {
      mediaBase64 = await fileToBase64(input.file);
    } catch (error) {
      console.error('Failed to convert media to base64:', error);
    }
  }

  const { data, error } = await supabase.functions.invoke<ApiResponse>('verify-content', {
    body: {
      content: input.content,
      type: input.type,
      mediaDescription: input.file?.name,
      mediaBase64,
      modelId: input.modelId,
    },
  });

  if (error) {
    console.error('Verification API error:', error);
    // Handle rate limit error specifically if possible
    if (error.message?.includes('429') || error.message?.toLowerCase().includes('limit')) {
      throw new Error('RATE_LIMIT_EXHAUSTED');
    }
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

// Generate a simple hash for content matching (normalized)
const hashContent = (content: string): string => {
  const normalized = (content || '').toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

export const submitFeedback = async (feedback: FeedbackSubmission): Promise<void> => {
  console.log('Submitting feedback via Edge Function for:', feedback.contentType, feedback.isCorrect ? 'positive' : 'negative');

  const { data, error } = await supabase.functions.invoke('process-feedback', {
    body: {
      content: feedback.content,
      contentType: feedback.contentType,
      originalVerdict: feedback.originalVerdict,
      originalScore: feedback.originalScore,
      isCorrect: feedback.isCorrect,
      userCorrection: feedback.userCorrection,
      correctVerdict: feedback.correctVerdict,
      imageBase64: feedback.imageBase64,
    },
  });

  if (error) {
    console.error('Edge Function feedback error:', error);
    throw new Error('Failed to process feedback: ' + error.message);
  }

  if (data && !data.success) {
    console.warn('Feedback rejected by AI:', data.reason);
    // We still resolve successfully to the user, but we log the rejection
    // Or we could throw if we want the user to know it was rejected.
    // Given the request "if it is false do not add it to the database", 
    // the backend already handles the logic of not adding it.
  }
};

export const shareVerdict = async (verdictId: string, platform: 'x' | 'instagram', caption: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('share-verdict', {
    body: { verdictId, platform, caption },
  });

  if (error) {
    console.error('Sharing error:', error);
    throw new Error(error.message || 'Failed to share verdict');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to share verdict');
  }
};
