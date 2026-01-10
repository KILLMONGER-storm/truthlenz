import type { VerificationInput, VerificationResult, VerdictType, TextAnalysis, ClaimExtraction, MediaVerification } from '@/types/verification';

// Simulated AI analysis - ready for real API integration
const analyzeText = async (content: string): Promise<TextAnalysis> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const sensationalWords = ['shocking', 'breaking', 'urgent', 'you won\'t believe', 'must see', 'viral', 'exposed'];
  const emotionalWords = ['outrage', 'horrifying', 'amazing', 'incredible', 'devastating'];
  
  const lowerContent = content.toLowerCase();
  const foundSensational = sensationalWords.filter(word => lowerContent.includes(word));
  const foundEmotional = emotionalWords.filter(word => lowerContent.includes(word));
  
  const hasExcessiveCaps = (content.match(/[A-Z]{3,}/g) || []).length > 2;
  const hasExclamation = (content.match(/!/g) || []).length > 3;
  
  let verdict: VerdictType = 'reliable';
  const reasons: string[] = [];
  
  if (foundSensational.length > 0) {
    reasons.push('Contains sensational language typically used in misleading content');
    verdict = 'misleading';
  }
  
  if (foundEmotional.length > 0) {
    reasons.push('Uses emotional manipulation tactics');
    verdict = verdict === 'misleading' ? 'fake' : 'misleading';
  }
  
  if (hasExcessiveCaps) {
    reasons.push('Excessive use of capital letters for emphasis');
  }
  
  if (hasExclamation) {
    reasons.push('Overuse of exclamation marks');
  }
  
  if (reasons.length === 0) {
    reasons.push('Content appears to use neutral, factual language');
    reasons.push('No obvious manipulation tactics detected');
  }
  
  return {
    verdict,
    reasons,
    sensationalLanguage: foundSensational,
    emotionalPatterns: foundEmotional,
  };
};

const extractClaim = async (content: string): Promise<ClaimExtraction> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Simple claim extraction simulation
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const mainClaim = sentences[0]?.trim() || 'Unable to extract main claim';
  
  // Simulated fact-check results
  const keywords = content.toLowerCase();
  let factCheckResult: ClaimExtraction['factCheckResult'] = 'unverified';
  const sources: string[] = [];
  
  if (keywords.includes('covid') || keywords.includes('vaccine')) {
    factCheckResult = 'disputed';
    sources.push('World Health Organization', 'CDC Fact Check Database');
  } else if (keywords.includes('election') || keywords.includes('vote')) {
    factCheckResult = 'disputed';
    sources.push('Reuters Fact Check', 'Associated Press');
  } else if (keywords.includes('study') || keywords.includes('research')) {
    factCheckResult = 'confirmed';
    sources.push('PubMed Database', 'Academic Sources');
  }
  
  return {
    mainClaim: mainClaim.length > 100 ? mainClaim.substring(0, 100) + '...' : mainClaim,
    factCheckResult,
    sources,
  };
};

const verifyMedia = async (file?: File): Promise<MediaVerification | undefined> => {
  if (!file) return undefined;
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  // Simulated media analysis
  const description = isImage 
    ? 'Image shows a scene that appears to be from a news event'
    : 'Video content showing what appears to be event footage';
  
  const randomCheck = Math.random();
  
  return {
    description,
    isReused: randomCheck > 0.7,
    reusedFrom: randomCheck > 0.7 ? '2018 - Similar image found in news archives' : undefined,
    manipulationDetected: randomCheck > 0.85,
    matchesClaim: randomCheck < 0.6,
    flags: [
      ...(randomCheck > 0.7 ? ['Image may have been used in previous contexts'] : []),
      ...(randomCheck > 0.85 ? ['Potential signs of digital manipulation detected'] : []),
      ...(randomCheck >= 0.6 ? ['Media content may not directly support the claim'] : []),
    ],
  };
};

const calculateCredibilityScore = (
  textAnalysis: TextAnalysis,
  claimExtraction: ClaimExtraction,
  mediaVerification?: MediaVerification
): number => {
  let score = 100;
  
  // Text analysis impact
  if (textAnalysis.verdict === 'fake') score -= 40;
  else if (textAnalysis.verdict === 'misleading') score -= 25;
  
  score -= textAnalysis.sensationalLanguage.length * 5;
  score -= textAnalysis.emotionalPatterns.length * 5;
  
  // Claim verification impact
  if (claimExtraction.factCheckResult === 'false') score -= 35;
  else if (claimExtraction.factCheckResult === 'disputed') score -= 20;
  else if (claimExtraction.factCheckResult === 'unverified') score -= 10;
  
  // Media verification impact
  if (mediaVerification) {
    if (mediaVerification.isReused) score -= 15;
    if (mediaVerification.manipulationDetected) score -= 25;
    if (!mediaVerification.matchesClaim) score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
};

const getVerdict = (score: number): VerdictType => {
  if (score >= 70) return 'reliable';
  if (score >= 40) return 'misleading';
  return 'fake';
};

const generateExplanation = (
  score: number,
  verdict: VerdictType,
  textAnalysis: TextAnalysis,
  claimExtraction: ClaimExtraction,
  mediaVerification?: MediaVerification
): string => {
  const parts: string[] = [];
  
  if (verdict === 'fake') {
    parts.push('This content is likely fake');
  } else if (verdict === 'misleading') {
    parts.push('This content may be misleading');
  } else {
    parts.push('This content appears to be reliable');
  }
  
  if (claimExtraction.factCheckResult === 'false') {
    parts.push('the main claim has been debunked by fact-checkers');
  } else if (claimExtraction.factCheckResult === 'disputed') {
    parts.push('the claim is disputed by credible sources');
  }
  
  if (textAnalysis.sensationalLanguage.length > 0) {
    parts.push('sensational language is used');
  }
  
  if (mediaVerification?.isReused) {
    parts.push(`the image appears to be reused from ${mediaVerification.reusedFrom}`);
  }
  
  if (mediaVerification?.manipulationDetected) {
    parts.push('signs of digital manipulation were detected');
  }
  
  return parts.length > 1 
    ? `${parts[0]} because ${parts.slice(1).join(', ')}.`
    : `${parts[0]}. No significant red flags were detected in our analysis.`;
};

export const verifyContent = async (input: VerificationInput): Promise<VerificationResult> => {
  const [textAnalysis, claimExtraction, mediaVerification] = await Promise.all([
    analyzeText(input.content),
    extractClaim(input.content),
    verifyMedia(input.file),
  ]);
  
  const credibilityScore = calculateCredibilityScore(textAnalysis, claimExtraction, mediaVerification);
  const verdict = getVerdict(credibilityScore);
  const explanation = generateExplanation(credibilityScore, verdict, textAnalysis, claimExtraction, mediaVerification);
  
  return {
    id: crypto.randomUUID(),
    input,
    credibilityScore,
    verdict,
    textAnalysis,
    claimExtraction,
    mediaVerification,
    explanation,
    timestamp: new Date(),
  };
};
