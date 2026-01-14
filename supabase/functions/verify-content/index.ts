import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  content: string;
  type: 'text' | 'url' | 'image' | 'video';
  mediaDescription?: string;
  mediaBase64?: string;
  // Legacy field support
  imageBase64?: string;
}

interface TextAnalysis {
  verdict: 'reliable' | 'misleading' | 'fake';
  reasons: string[];
  sensationalLanguage: string[];
  emotionalPatterns: string[];
}

interface ClaimExtraction {
  mainClaim: string;
  factCheckResult: 'confirmed' | 'disputed' | 'false' | 'unverified';
  sources: string[];
}

interface ImageInspectionDetail {
  category: string;
  finding: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
}

interface MediaVerification {
  description: string;
  isReused: boolean;
  reusedFrom?: string;
  manipulationDetected: boolean;
  matchesClaim: boolean;
  flags: string[];
  authenticityScore?: number;
  mediaVerdict?: 'real' | 'edited' | 'ai_generated' | 'suspicious';
  imageVerdict?: 'real' | 'edited' | 'ai_generated' | 'suspicious';
  mediaType?: 'image' | 'video';
  analysisDetails?: {
    pixelAnalysis?: ImageInspectionDetail[];
    textureAnalysis?: ImageInspectionDetail[];
    semanticAnalysis?: ImageInspectionDetail[];
    brandAuthenticity?: ImageInspectionDetail[];
    humanAnalysis?: ImageInspectionDetail[];
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

interface FeedbackRecord {
  original_content: string;
  original_verdict: string;
  correct_verdict: string;
  user_correction: string;
  content_type: string;
  image_base64?: string;
}

// Generate a simple hash for content matching
const hashContent = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

// Fetch relevant feedback from database for similar content
const getRelevantFeedback = async (content: string, contentType: string): Promise<FeedbackRecord[]> => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.log("Supabase credentials not available for feedback lookup");
      return [];
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const contentHash = hashContent(content);

    // Get exact matches first
    const { data: exactMatches } = await supabase
      .from('verification_feedback')
      .select('original_content, original_verdict, correct_verdict, user_correction, content_type, image_base64')
      .eq('content_hash', contentHash)
      .eq('is_correct', false)
      .not('user_correction', 'is', null)
      .limit(3);

    if (exactMatches && exactMatches.length > 0) {
      return exactMatches;
    }

    // Get recent corrections for the same content type
    const { data: recentFeedback } = await supabase
      .from('verification_feedback')
      .select('original_content, original_verdict, correct_verdict, user_correction, content_type, image_base64')
      .eq('is_correct', false)
      .eq('content_type', contentType)
      .not('user_correction', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    return recentFeedback || [];
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return [];
  }
};

// Call AI model for media analysis (image or video)
const analyzeMediaWithModel = async (
  apiKey: string,
  model: string,
  mediaBase64: string,
  prompt: string,
  mediaType: 'image' | 'video' = 'image'
): Promise<any> => {
  const systemContent = mediaType === 'video'
    ? "You are a multimodal forensic verification system specializing in video analysis. Your goal is not to be persuasive, polite, or fast, but to be correct. Assume all inputs may be deceptive. Respond with valid JSON only."
    : "You are a multimodal forensic verification system specializing in image analysis. Your goal is not to be persuasive, polite, or fast, but to be correct. Assume all inputs may be deceptive. Respond with valid JSON only.";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemContent },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: mediaBase64 } }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Model ${model} failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
};

// Parse JSON safely
const safeParseJSON = (content: string): any => {
  let cleanedContent = content.trim();
  if (cleanedContent.startsWith("```json")) {
    cleanedContent = cleanedContent.slice(7);
  } else if (cleanedContent.startsWith("```")) {
    cleanedContent = cleanedContent.slice(3);
  }
  if (cleanedContent.endsWith("```")) {
    cleanedContent = cleanedContent.slice(0, -3);
  }
  return JSON.parse(cleanedContent.trim());
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json() as VerificationRequest;
    const { content, type, mediaDescription } = requestData;
    // Support both legacy imageBase64 and new mediaBase64
    const mediaBase64 = requestData.mediaBase64 || requestData.imageBase64;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Verifying content of type: ${type}, length: ${content.length}, hasMedia: ${!!mediaBase64}`);

    // Fetch relevant feedback including image feedback for training
    const relevantFeedback = await getRelevantFeedback(content, type);
    let feedbackContext = "";
    const mediaFeedbackExamples: Array<{ media: string; correction: string; correctVerdict: string; mediaType: string }> = [];

    if (relevantFeedback.length > 0) {
      // Separate media feedback with actual media for multi-modal training
      for (const f of relevantFeedback) {
        if ((f.content_type === 'image' || f.content_type === 'video') && f.image_base64) {
          mediaFeedbackExamples.push({
            media: f.image_base64,
            correction: f.user_correction,
            correctVerdict: f.correct_verdict,
            mediaType: f.content_type
          });
        }
      }

      feedbackContext = `
IMPORTANT: Learn from these user corrections on similar content:
${relevantFeedback.map((f, i) => `
Correction ${i + 1} (${f.content_type}):
- Original verdict: ${f.original_verdict}
- Correct verdict: ${f.correct_verdict}
- User's explanation: "${f.user_correction}"
`).join('\n')}
Use these corrections to improve your analysis and avoid similar mistakes.`;
      console.log(`Including ${relevantFeedback.length} feedback records (${mediaFeedbackExamples.length} with media)`);
    }

    let messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;

    if ((type === 'image' || type === 'video') && mediaBase64) {
      const isVideo = type === 'video';
      // Comprehensive multi-level media analysis prompt
      const mediaAnalysisPrompt = isVideo ? `You are a temporal and audiovisual forensic analyst.
Your goal is accuracy, not decisiveness. Treat realism as suspicious until proven otherwise.

${content ? `Context: "${content}"` : ''}
${mediaDescription ? `Filename: ${mediaDescription}` : ''}
${feedbackContext}

## FORENSIC PROTOCOL:
1. Decompose the video into verifiable components (frames, audio, temporal flow).
2. Analyze each component independently using modality-specific reasoning.
3. Cross-check internal consistency and external plausibility.
4. Detect signs of AI generation, manipulation, or contextual misuse.
5. Assign calibrated confidence scores.

## REQUIRED ANALYSIS STEPS:

### 1. FACIAL & ID DRIFT (Forensic)
- Examine facial consistency across frames (micro-feature stability).
- Check lip-sync accuracy with spoken audio (coarticulation analysis).
- Look for unnatural eye blinking or facial stiffness (liveness detection).
- Detect temporal smoothing or frame-to-frame identity drift.
- Analyze audio for synthetic voice artifacts (robotic timbre, breath patterns).

### 2. TEMPORAL & PHYSICS
- Frame rate consistency and motion blur authenticity.
- Physical plausibility of movements (gravity, momentum).
- Shadow and lighting coherence through time/motion.
- "Uncanny valley" features in motion.

### 3. CROSS-MODAL CONSISTENCY
- Do visual events match audio cues exactly?
- Does the scene context match the alleged location/time?
- Are there signs of splicing from multiple sources?

### 4. DEEPFAKE SPECIFICS
- Face boundary artifacts (hairline, ears, neck).
- Skin tone consistency across lighting changes.
- Eye reflection consistency.

If evidence is insufficient, classify as "Inconclusive". False positives are dangerous.

Respond with ONLY this JSON structure:
{
  "mediaVerdict": "real" | "edited" | "ai_generated" | "suspicious" | "inconclusive",
  "authenticityScore": 0-100,
  "description": "Scientific description of the video content",
  "explanation": "Step-by-step forensic reasoning explaining the verdict. Cite specific timestamps or frames if possible.",
  "analysisDetails": {
    "humanAnalysis": [
      {"category": "Facial Consistency", "finding": "observation", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "audioAnalysis": [
      {"category": "Lip-Sync/Voice", "finding": "observation", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "temporalAnalysis": [
      {"category": "Motion/Physics", "finding": "observation", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "crossMatchResults": {
      "hasOnlineMatch": true|false,
      "matchConfidence": 0-100,
      "possibleSources": []
    }
  },
  "inspectionHighlights": ["Forensic Indicator 1", "Forensic Indicator 2"],
  "flags": ["Risk Factor 1", "Risk Factor 2"],
  "isManipulated": true|false,
  "isAiGenerated": true|false,
  "isDeepfake": true|false,
  "verdict": "reliable" | "misleading" | "fake" | "inconclusive",
  "credibilityScore": 0-100,
  "mainClaim": "The apparent narrative of the video",
  "factCheckResult": "confirmed" | "disputed" | "false" | "unverified"
}` : `You are a digital forensics expert.
Your goal is accuracy, not decisiveness. Treat realism as suspicious until proven otherwise.

${content ? `Context: "${content}"` : ''}
${mediaDescription ? `Filename: ${mediaDescription}` : ''}
${feedbackContext}

## FORENSIC PROTOCOL:
1. Inspeck skin texture realism and micro-details (pores, imperfections).
2. Check lighting consistency across objects and faces (shadow vectors).
3. Analyze edge blending, halos, and unnatural sharpness (splicing artifacts).
4. Examine logos, text, or symbols for deformation or incorrect geometry (AI signs).
5. Check reflections in eyes, mirrors, or glass (geometry consistency).
6. Look for GAN fingerprints or over-smoothing.
7. Assess if the image is contextually misleading even if unedited.

If evidence is insufficient, classify as "Inconclusive".

Respond with ONLY this JSON structure:
{
  "mediaVerdict": "real" | "edited" | "ai_generated" | "suspicious" | "inconclusive",
  "authenticityScore": 0-100,
  "description": "Forensic description of the image content",
  "explanation": "Step-by-step forensic reasoning explaining the verdict.",
  "analysisDetails": {
    "pixelAnalysis": [
      {"category": "Compression/Noise", "finding": "observation", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "textureAnalysis": [
      {"category": "Skin/Surface", "finding": "observation", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "semanticAnalysis": [
      {"category": "Lighting/Physics", "finding": "observation", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "brandAuthenticity": [
      {"category": "Logos/Text", "finding": "observation", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "humanAnalysis": [
      {"category": "Anatomy/Eyes", "finding": "observation", "confidence": 0-100, "severity": "low|medium|high"}
    ]
  },
  "inspectionHighlights": ["Forensic Indicator 1", "Forensic Indicator 2"],
  "flags": ["Risk Factor 1", "Risk Factor 2"],
  "isManipulated": true|false,
  "isAiGenerated": true|false,
  "verdict": "reliable" | "misleading" | "fake" | "inconclusive",
  "credibilityScore": 0-100,
  "mainClaim": "The visual claim",
  "factCheckResult": "confirmed" | "disputed" | "false" | "unverified"
}`;

      // Build messages with media feedback examples for training
      const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: "text", text: mediaAnalysisPrompt },
        { type: "image_url", image_url: { url: mediaBase64 } }
      ];

      // Add past media feedback as training examples (limit to 2 to avoid token limits)
      if (mediaFeedbackExamples.length > 0) {
        const trainingPrefix = {
          type: "text",
          text: `\n\n## TRAINING FROM PAST USER CORRECTIONS:\nThe following are examples of ${isVideo ? 'videos' : 'images'} where users corrected our analysis. Learn from these patterns:\n`
        };
        userContent.push(trainingPrefix);

        for (const example of mediaFeedbackExamples.slice(0, 2)) {
          userContent.push({ type: "image_url", image_url: { url: example.media } });
          userContent.push({
            type: "text",
            text: `User correction: This ${example.mediaType} should be "${example.correctVerdict}". Reason: "${example.correction}"\n`
          });
        }
      }

      // Primary model analysis (Gemini 2.5 Pro for best media understanding)
      console.log(`Starting primary model analysis (gemini-2.5-pro) for ${type}...`);
      let primaryAnalysis: any;
      const systemPrompt = isVideo
        ? "You are a multimodal forensic verification system. Your goal is accuracy, not decisiveness. Respond with valid JSON only."
        : "You are a multimodal forensic verification system. Your goal is accuracy, not decisiveness. Respond with valid JSON only.";

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent }
            ],
          }),
        });

        if (!response.ok) throw new Error(`Primary model failed: ${response.status}`);
        const data = await response.json();
        primaryAnalysis = safeParseJSON(data.choices?.[0]?.message?.content);
        console.log("Primary analysis complete");
      } catch (error) {
        console.error("Primary model failed:", error);
        // Fallback to flash model with simpler message
        const fallbackResponse = await analyzeMediaWithModel(
          LOVABLE_API_KEY,
          "google/gemini-2.5-flash",
          mediaBase64,
          mediaAnalysisPrompt,
          type as 'image' | 'video'
        );
        primaryAnalysis = safeParseJSON(fallbackResponse);
      }

      // Secondary model for cross-verification (Gemini Flash for speed)
      console.log("Starting secondary model verification (gemini-2.5-flash)...");
      let secondaryAnalysis: any = null;
      let modelAgreement: any = null;

      try {
        const secondaryPrompt = isVideo
          ? `Quickly analyze this video for authenticity. Is it: real, edited, AI-generated, or a deepfake?
Respond with JSON only:
{
  "verdict": "real" | "edited" | "ai_generated" | "suspicious",
  "confidence": 0-100,
  "keyReasons": ["reason1", "reason2", "reason3"]
}`
          : `Quickly analyze this image for authenticity. Is it: real, edited, or AI-generated?
Respond with JSON only:
{
  "verdict": "real" | "edited" | "ai_generated" | "suspicious",
  "confidence": 0-100,
  "keyReasons": ["reason1", "reason2", "reason3"]
}`;

        const secondaryResponse = await analyzeMediaWithModel(
          LOVABLE_API_KEY,
          "google/gemini-2.5-flash",
          mediaBase64,
          secondaryPrompt,
          type as 'image' | 'video'
        );
        secondaryAnalysis = safeParseJSON(secondaryResponse);
        console.log("Secondary analysis complete");

        // Calculate model agreement - use mediaVerdict for both image and video
        const primaryVerdict = primaryAnalysis.mediaVerdict || primaryAnalysis.imageVerdict;
        const verdictMatch = primaryVerdict === secondaryAnalysis.verdict;
        let agreementLevel: 'high' | 'medium' | 'low' = 'high';
        let confidenceAdjustment = "Models agree - high confidence";

        if (!verdictMatch) {
          const primaryIsReal = primaryVerdict === 'real';
          const secondaryIsReal = secondaryAnalysis.verdict === 'real';

          if (primaryIsReal !== secondaryIsReal) {
            agreementLevel = 'low';
            confidenceAdjustment = "Models disagree significantly - confidence reduced, flagged for review";
            // Reduce authenticity score when models disagree
            primaryAnalysis.authenticityScore = Math.max(20, primaryAnalysis.authenticityScore - 25);
          } else {
            agreementLevel = 'medium';
            confidenceAdjustment = "Models partially agree - moderate confidence";
            primaryAnalysis.authenticityScore = Math.max(30, primaryAnalysis.authenticityScore - 10);
          }
        }

        modelAgreement = {
          primaryVerdict: primaryVerdict,
          secondaryVerdict: secondaryAnalysis.verdict,
          agreementLevel,
          confidenceAdjustment
        };
      } catch (error) {
        console.error("Secondary model failed:", error);
        const fallbackVerdict = primaryAnalysis.mediaVerdict || primaryAnalysis.imageVerdict;
        modelAgreement = {
          primaryVerdict: fallbackVerdict,
          secondaryVerdict: "unavailable",
          agreementLevel: 'medium' as const,
          confidenceAdjustment: "Single model analysis - secondary verification unavailable"
        };
      }

      // Add model agreement to analysis details
      if (primaryAnalysis.analysisDetails) {
        primaryAnalysis.analysisDetails.modelAgreement = modelAgreement;
      } else {
        primaryAnalysis.analysisDetails = { modelAgreement };
      }

      // Normalize verdict field (use mediaVerdict for both image and video)
      const mediaVerdict = primaryAnalysis.mediaVerdict || primaryAnalysis.imageVerdict;

      // Build the response
      const textAnalysis: TextAnalysis = {
        verdict: primaryAnalysis.verdict || (mediaVerdict === 'real' ? 'reliable' :
          mediaVerdict === 'suspicious' ? 'misleading' : 'fake'),
        reasons: primaryAnalysis.reasons || [],
        sensationalLanguage: [],
        emotionalPatterns: [],
      };

      const claimExtraction: ClaimExtraction = {
        mainClaim: primaryAnalysis.mainClaim || primaryAnalysis.description || `${isVideo ? 'Video' : 'Image'} analysis`,
        factCheckResult: primaryAnalysis.factCheckResult || 'unverified',
        sources: isVideo
          ? ['Multi-Model AI Analysis', 'Temporal Analysis', 'Deepfake Detection', 'Audio Sync Analysis']
          : ['Multi-Model AI Analysis', 'Pixel-Level Inspection', 'Semantic Verification'],
      };

      const mediaVerification: MediaVerification = {
        description: primaryAnalysis.description || `Analyzed ${mediaDescription || `uploaded ${type}`}`,
        isReused: primaryAnalysis.analysisDetails?.crossMatchResults?.hasOnlineMatch || false,
        reusedFrom: primaryAnalysis.analysisDetails?.crossMatchResults?.possibleSources?.[0],
        manipulationDetected: primaryAnalysis.isManipulated || primaryAnalysis.isAiGenerated || primaryAnalysis.isDeepfake || false,
        matchesClaim: mediaVerdict === 'real',
        flags: [
          ...(primaryAnalysis.flags || []),
          ...(primaryAnalysis.manipulationSigns || []),
          ...(primaryAnalysis.aiGenerationSigns || []),
          ...(primaryAnalysis.deepfakeSigns || []),
        ],
        authenticityScore: primaryAnalysis.authenticityScore,
        mediaVerdict: mediaVerdict,
        imageVerdict: mediaVerdict, // Keep for backwards compatibility
        mediaType: type as 'image' | 'video',
        analysisDetails: primaryAnalysis.analysisDetails,
        inspectionHighlights: primaryAnalysis.inspectionHighlights || [],
      };

      const credibilityScore = primaryAnalysis.credibilityScore ?? primaryAnalysis.authenticityScore ?? 50;

      const result = {
        id: crypto.randomUUID(),
        credibilityScore,
        verdict: textAnalysis.verdict,
        textAnalysis,
        claimExtraction,
        mediaVerification,
        explanation: primaryAnalysis.explanation || `${isVideo ? 'Video' : 'Image'} classified as ${mediaVerdict}.`,
        timestamp: new Date().toISOString(),
      };

      console.log(`${isVideo ? 'Video' : 'Image'} verification complete, authenticity score:`, primaryAnalysis.authenticityScore);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // Text-based analysis with real web search using Gemini
      const GEMINI_API_KEY = Deno.env.get("geminiapikey");

      if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured");
      }

      console.log("Starting web search verification with Gemini...");

      // Step 1: Use Gemini with Google Search grounding to find real sources
      const searchPrompt = `Perform an EXTENSIVE and EXHAUSTIVE web search to verify this claim.
Your goal is to find ORIGINAL SOURCES, OFFICIAL NOTIFICATIONS, or DEFINITIVE DEBUNKS.

CLAIM TO VERIFY:
"${content}"

SEARCH PROTOCOL:
1.  **Official Verification**: Search for official press releases, government notifications, or company statements matching specific dates/figures. (e.g., if RBI is mentioned, search 'RBI press release [date]').
2.  **Credible News**: Check major, top-tier news outlets (Reuters, AP, PTI, Bloomberg). Use specific keywords from the text via "site:reuters.com" etc. logic.
3.  **Cross-Referencing**: Look for the *exact phrasing* of quotes to see if they appear in real interviews.
4.  **Absence of Evidence**: If a major announcement is claimed (e.g., "New Bank Rules"), search for the *lack* of coverage in financial news, which is a strong signal of a fake.
5.  **Fact-Checkers**: Search for specific debunking articles (Snopes, AltNews, BoomLive, PIB Fact Check) related to these keywords.

Find and report:
- Direct links to official documents/notifications if they exist.
- Whether major outlets are silent on this "breaking news" (Red Flag).
- Any similar known hoaxes or ongoing misinformation campaigns.`;

      const searchResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: searchPrompt }] }],
            tools: [{ googleSearch: {} }],
          }),
        }
      );

      if (!searchResponse.ok) {
        const status = searchResponse.status;
        console.error("Gemini search error:", status);
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`Gemini search failed: ${status}`);
      }

      const searchData = await searchResponse.json();
      const searchResults = searchData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const groundingMetadata = searchData.candidates?.[0]?.groundingMetadata;

      // Extract sources from grounding metadata
      const webSources: string[] = [];
      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web?.uri) {
            webSources.push(chunk.web.uri);
          }
        }
      }

      console.log(`Found ${webSources.length} web sources for verification`);

      // Step 2: Analyze the search results to make a verdict
      const analysisPrompt = `You are a Forensic Fact-Checker and Credibility Auditor.
Your goal is accuracy, not decisiveness. Treat all claims as suspicious until proven otherwise.

ORIGINAL CLAIM:
"""
${content}
"""

WEB SEARCH RESULTS:
"""
${searchResults}
"""

SOURCES FOUND: ${webSources.length > 0 ? webSources.slice(0, 5).join(", ") : "No specific sources found"}

${feedbackContext}

## FORENSIC PROTOCOL:
1.  **Extract & Isolate**: Extract factual claims (dates, numbers, quotes, official bodies).
2.  **Official Source Check**: If the claim attributes action to an entity (e.g., "RBI introduces..."), is there a matching *Official Notification* or release in the search results?
    -   **CRITICAL RULE**: If a major official action is claimed but NOT found on the official website or major financial wires, it is likely a **SOPHISTICATED FAKE**.
3.  **"Realistic Fake" Detection**:
    -   Does the text use "authoritative" language (e.g., "according to sources," "internal memo") without naming a veritable source? -> **High Probability of Fake**.
    -   Does it mix real context (e.g., "rising fraud") with a fake specific action? -> **Misleading/Fake**.
4.  **Silence as Evidence**: If the search results show NO coverage from major relevant outlets for a "breaking" story, treat this as evidence of falsity.

## VERDICT CRITERIA:
-   **"fake"**:
    -   Proven false by fact-checkers.
    -   Claims "Official Action" but no official source exists.
    -   Claims "Breaking News" but major outlets are silent.
    -   Credibility Score MUST be < 40.
-   **"misleading"**:
    -   Real events taken out of context.
    -   "Likely" or "Proposed" actions presented as "Done".
    -   Credibility Score between 50-70.
-   **"reliable"**:
    -   Confirmed by official sources (links found).
    -   Reported by multiple independent top-tier outlets with matching details.
    -   Credibility Score > 90.

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "verdict": "reliable" | "misleading" | "fake" | "inconclusive",
  "reasons": ["Forensic Reason 1", "Forensic Reason 2", ...],
  "sensationalLanguage": ["word1", "word2", ...],
  "emotionalPatterns": ["pattern1", "pattern2", ...],
  "mainClaim": "Decomposed factual claim",
  "factCheckResult": "confirmed" | "disputed" | "false" | "unverified",
  "credibilityScore": 0-100,
  "explanation": "Step-by-step forensic explanation. Explicitly state if 'official sources' were checked and missing. Use strong language if it appears to be a realistic fake.",
  "sourcesAnalysis": {
    "reliableSources": ["list of reliable sources found"],
    "unreliableSources": ["list of unreliable/questionable sources"],
    "factChecks": ["any fact-check articles found"],
    "noSourcesFound": true/false
  }
}

IMPORTANT: If the claim looks like an official announcement but NO official source is found in search results, you MUST classify as "fake" with a low score (under 30).`;

      const analysisResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: analysisPrompt }] }],
          }),
        }
      );

      if (!analysisResponse.ok) {
        throw new Error(`Gemini analysis failed: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      const aiContent = analysisData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiContent) {
        throw new Error("No response from AI model");
      }

      let analysis;
      try {
        analysis = safeParseJSON(aiContent);
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        // If we couldn't find sources earlier, default to low credibility
        const noSourcesFound = webSources.length === 0;
        analysis = {
          verdict: noSourcesFound ? "fake" : "misleading",
          reasons: noSourcesFound
            ? ["No reliable sources found for this claim", "Content could not be verified through web search"]
            : ["Unable to fully analyze content"],
          sensationalLanguage: [],
          emotionalPatterns: [],
          mainClaim: content.substring(0, 100),
          factCheckResult: "unverified",
          credibilityScore: noSourcesFound ? 15 : 40,
          explanation: noSourcesFound
            ? "This claim could not be verified - no reliable sources were found reporting this information. Exercise extreme caution."
            : "Analysis could not be completed.",
          sourcesAnalysis: {
            reliableSources: [],
            unreliableSources: [],
            factChecks: [],
            noSourcesFound
          }
        };
      }

      const textAnalysis: TextAnalysis = {
        verdict: analysis.verdict || 'misleading',
        reasons: analysis.reasons || [],
        sensationalLanguage: analysis.sensationalLanguage || [],
        emotionalPatterns: analysis.emotionalPatterns || [],
      };

      // Build sources list from both grounding metadata and analysis
      const allSources = [
        ...webSources.slice(0, 3),
        ...(analysis.sourcesAnalysis?.reliableSources || []).slice(0, 2),
        ...(analysis.sourcesAnalysis?.factChecks || []).slice(0, 2),
      ].filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 5);

      const claimExtraction: ClaimExtraction = {
        mainClaim: analysis.mainClaim || "Unable to extract main claim",
        factCheckResult: analysis.factCheckResult || 'unverified',
        sources: allSources.length > 0 ? allSources : ['No reliable sources found - Web Search Verification'],
      };

      const credibilityScore = analysis.credibilityScore ??
        (textAnalysis.verdict === 'reliable' ? 85 :
          textAnalysis.verdict === 'misleading' ? 55 : 25);

      // Force verdict based on score thresholds
      if (credibilityScore < 40) {
        textAnalysis.verdict = 'fake';
      } else if (credibilityScore >= 50 && credibilityScore <= 70) {
        textAnalysis.verdict = 'misleading';
      } else if (credibilityScore > 90) {
        textAnalysis.verdict = 'reliable';
      }

      // Enhance explanation with source information
      let explanation = analysis.explanation || `Content classified as ${textAnalysis.verdict}.`;
      if (analysis.sourcesAnalysis?.noSourcesFound || webSources.length === 0) {
        explanation = `⚠️ INSUFFICIENT INFORMATION: ${explanation}`;
      }

      const result = {
        id: crypto.randomUUID(),
        credibilityScore,
        verdict: textAnalysis.verdict,
        textAnalysis,
        claimExtraction,
        explanation,
        timestamp: new Date().toISOString(),
      };

      console.log(`Web search verification complete. Sources found: ${webSources.length}, Verdict: ${textAnalysis.verdict}`);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Verification failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
