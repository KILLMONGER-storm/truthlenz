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
  const contentHash = hashContent(feedback.content || 'no-content');

  // For images, include the base64 data for AI training (limit to ~500KB)
  const imageBase64ForStorage = feedback.imageBase64 && feedback.imageBase64.length < 700000
    ? feedback.imageBase64
    : undefined;

  console.log('Submitting feedback for:', feedback.contentType, feedback.isCorrect ? 'positive' : 'negative');

  const { error } = await supabase
    .from('verification_feedback')
    .insert({
      content_hash: contentHash,
      original_content: (feedback.content || 'No content provided').substring(0, 5000),
      content_type: feedback.contentType || 'text',
      original_verdict: feedback.originalVerdict || 'inconclusive',
      original_score: Math.round(feedback.originalScore || 50),
      is_correct: feedback.isCorrect,
      user_correction: feedback.userCorrection || null,
      correct_verdict: feedback.correctVerdict || null,
      image_base64: imageBase64ForStorage || null,
    });

  if (error) {
    console.error('Supabase feedback error details:', error);
    throw new Error('Failed to save feedback: ' + error.message);
  }
};
