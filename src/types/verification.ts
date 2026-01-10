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

export interface ImageInspectionDetail {
  category: string;
  finding: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
}

export interface MediaVerification {
  description: string;
  isReused: boolean;
  reusedFrom?: string;
  manipulationDetected: boolean;
  matchesClaim: boolean;
  flags: string[];
  // Enhanced media analysis fields (for both images and videos)
  authenticityScore?: number;
  mediaVerdict?: 'real' | 'edited' | 'ai_generated' | 'suspicious';
  // Legacy field for backwards compatibility
  imageVerdict?: 'real' | 'edited' | 'ai_generated' | 'suspicious';
  mediaType?: 'image' | 'video';
  analysisDetails?: {
    pixelAnalysis?: ImageInspectionDetail[];
    textureAnalysis?: ImageInspectionDetail[];
    semanticAnalysis?: ImageInspectionDetail[];
    brandAuthenticity?: ImageInspectionDetail[];
    humanAnalysis?: ImageInspectionDetail[];
    // Video-specific analysis
    temporalAnalysis?: ImageInspectionDetail[];
    audioAnalysis?: ImageInspectionDetail[];
    frameConsistency?: ImageInspectionDetail[];
    crossMatchResults?: {
      hasOnlineMatch: boolean;
      matchConfidence: number;
      possibleSources: string[];
    };
    modelAgreement?: {
      primaryVerdict: string;
      secondaryVerdict: string;
      agreementLevel: 'high' | 'medium' | 'low';
      confidenceAdjustment: string;
    };
  };
  inspectionHighlights?: string[];
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
  correction?: string;
  correctVerdict?: VerdictType;
  timestamp: Date;
}

export interface FeedbackSubmission {
  content: string;
  contentType: 'text' | 'url' | 'image' | 'video';
  originalVerdict: VerdictType;
  originalScore: number;
  isCorrect: boolean;
  userCorrection?: string;
  correctVerdict?: VerdictType;
  imageBase64?: string;
}
