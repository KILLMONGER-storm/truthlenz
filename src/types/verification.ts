export type VerificationType = 'text' | 'url' | 'image' | 'video';

export type VerdictType = 'reliable' | 'misleading' | 'fake';

export interface VerificationInput {
  type: VerificationType;
  content: string;
  file?: File;
}

export interface TextAnalysis {
  verdict: VerdictType;
  reasons: string[];
  sensationalLanguage: string[];
  emotionalPatterns: string[];
}

export interface ClaimExtraction {
  mainClaim: string;
  factCheckResult: 'confirmed' | 'disputed' | 'false' | 'unverified';
  sources: string[];
}

export interface MediaVerification {
  description: string;
  isReused: boolean;
  reusedFrom?: string;
  manipulationDetected: boolean;
  matchesClaim: boolean;
  flags: string[];
}

export interface VerificationResult {
  id: string;
  input: VerificationInput;
  credibilityScore: number;
  verdict: VerdictType;
  textAnalysis: TextAnalysis;
  claimExtraction: ClaimExtraction;
  mediaVerification?: MediaVerification;
  explanation: string;
  timestamp: Date;
}

export interface UserFeedback {
  resultId: string;
  isCorrect: boolean;
  timestamp: Date;
}
