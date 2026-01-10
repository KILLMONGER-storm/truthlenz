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
  imageVerdict?: 'real' | 'edited' | 'ai_generated' | 'suspicious';
  analysisDetails?: {
    pixelAnalysis?: ImageInspectionDetail[];
    textureAnalysis?: ImageInspectionDetail[];
    semanticAnalysis?: ImageInspectionDetail[];
    brandAuthenticity?: ImageInspectionDetail[];
    humanAnalysis?: ImageInspectionDetail[];
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

// Call AI model for image analysis
const analyzeImageWithModel = async (
  apiKey: string,
  model: string,
  imageBase64: string,
  prompt: string
): Promise<any> => {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { 
          role: "system", 
          content: "You are an expert forensic image analyst specializing in detecting AI-generated, manipulated, and fake images. Respond with valid JSON only." 
        },
        { 
          role: "user", 
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageBase64 } }
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
    const { content, type, mediaDescription, imageBase64 } = await req.json() as VerificationRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Verifying content of type: ${type}, length: ${content.length}, hasImage: ${!!imageBase64}`);

    // Fetch relevant feedback including image feedback for training
    const relevantFeedback = await getRelevantFeedback(content, type);
    let feedbackContext = "";
    const imageFeedbackExamples: Array<{ image: string; correction: string; correctVerdict: string }> = [];
    
    if (relevantFeedback.length > 0) {
      // Separate image feedback with actual images for multi-modal training
      for (const f of relevantFeedback) {
        if (f.content_type === 'image' && f.image_base64) {
          imageFeedbackExamples.push({
            image: f.image_base64,
            correction: f.user_correction,
            correctVerdict: f.correct_verdict
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
      console.log(`Including ${relevantFeedback.length} feedback records (${imageFeedbackExamples.length} with images)`);
    }

    let messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
    
    if (type === 'image' && imageBase64) {
      // Comprehensive multi-level image analysis prompt
      const imageAnalysisPrompt = `You are a forensic image analyst. Perform comprehensive analysis of this image.

${content ? `Context: "${content}"` : ''}
${mediaDescription ? `Filename: ${mediaDescription}` : ''}
${feedbackContext}

## REQUIRED ANALYSIS LEVELS:

### 1. PIXEL-LEVEL ANALYSIS
- Check for compression artifacts inconsistencies
- Analyze noise patterns across the image
- Detect cloning/copy-paste regions
- Look for resolution mismatches between elements
- Check for JPEG ghost artifacts from re-saving

### 2. TEXTURE ANALYSIS
- Skin texture consistency (pores, noise patterns, lighting gradients)
- Fabric weave realism (jerseys, clothing texture, embroidery edges)
- Surface material authenticity (metal, wood, glass reflections)
- Hair strand naturalness and consistency
- Background texture coherence

### 3. SEMANTIC ANALYSIS
- Shadow direction and consistency
- Lighting source coherence across all objects
- Perspective and vanishing point accuracy
- Scale proportions of objects
- Physical plausibility of the scene

### 4. BRAND & OBJECT AUTHENTICITY
- Logo geometry accuracy (shape distortion, symmetry errors)
- Typography/font accuracy on visible text
- Color accuracy of known brands
- Proportions of branded objects
- Detail level consistency with authentic items

### 5. HUMAN ANALYSIS (if people present)
- Facial micro-details (skin pores, wrinkles, asymmetries)
- Eye reflection consistency and realism
- Ear symmetry and detail
- Hand/finger proportions and detail
- Hair-to-skin boundary naturalness
- Teeth detail and alignment

### 6. AI GENERATION DETECTION
- Common AI artifacts (melted fingers, asymmetric features)
- Unnatural smoothness or over-sharpening
- Repetitive patterns in backgrounds
- Inconsistent detail levels
- Text/letter rendering issues
- "Uncanny valley" facial features

### 7. CROSS-MATCH ASSESSMENT
- Does this appear to be a unique photo or potentially reused?
- Signs of image splicing from multiple sources
- Metadata consistency indicators

Respond with ONLY this JSON structure:
{
  "imageVerdict": "real" | "edited" | "ai_generated" | "suspicious",
  "authenticityScore": 0-100,
  "description": "What the image depicts",
  "explanation": "Plain-English summary of findings prioritizing the most significant issues",
  "analysisDetails": {
    "pixelAnalysis": [
      {"category": "Compression", "finding": "description", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "textureAnalysis": [
      {"category": "Skin/Fabric/Surface", "finding": "description", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "semanticAnalysis": [
      {"category": "Shadows/Lighting/Perspective", "finding": "description", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "brandAuthenticity": [
      {"category": "Logo/Text/Brand", "finding": "description", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "humanAnalysis": [
      {"category": "Face/Body/Features", "finding": "description", "confidence": 0-100, "severity": "low|medium|high"}
    ],
    "crossMatchResults": {
      "hasOnlineMatch": true|false,
      "matchConfidence": 0-100,
      "possibleSources": ["source1", "source2"]
    }
  },
  "inspectionHighlights": ["Key finding 1", "Key finding 2", "Key finding 3"],
  "flags": ["Warning 1", "Warning 2"],
  "isManipulated": true|false,
  "manipulationSigns": ["sign1", "sign2"],
  "isAiGenerated": true|false,
  "aiGenerationSigns": ["sign1", "sign2"],
  "verdict": "reliable" | "misleading" | "fake",
  "credibilityScore": 0-100,
  "mainClaim": "What the image claims to show",
  "factCheckResult": "confirmed" | "disputed" | "false" | "unverified",
  "reasons": ["reason1", "reason2"]
}`;

      // Build messages with image feedback examples for training
      const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: "text", text: imageAnalysisPrompt },
        { type: "image_url", image_url: { url: imageBase64 } }
      ];
      
      // Add past image feedback as training examples (limit to 2 to avoid token limits)
      if (imageFeedbackExamples.length > 0) {
        const trainingPrefix = { 
          type: "text", 
          text: "\n\n## TRAINING FROM PAST USER CORRECTIONS:\nThe following are examples of images where users corrected our analysis. Learn from these patterns:\n" 
        };
        userContent.push(trainingPrefix);
        
        for (const example of imageFeedbackExamples.slice(0, 2)) {
          userContent.push({ type: "image_url", image_url: { url: example.image } });
          userContent.push({ 
            type: "text", 
            text: `User correction: This image should be "${example.correctVerdict}". Reason: "${example.correction}"\n` 
          });
        }
      }

      // Primary model analysis (Gemini 2.5 Pro for best image understanding)
      console.log("Starting primary model analysis (gemini-2.5-pro)...");
      let primaryAnalysis: any;
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
              { 
                role: "system", 
                content: "You are an expert forensic image analyst. Learn from user corrections to improve accuracy. Respond with valid JSON only." 
              },
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
        const fallbackResponse = await analyzeImageWithModel(
          LOVABLE_API_KEY,
          "google/gemini-2.5-flash",
          imageBase64,
          imageAnalysisPrompt
        );
        primaryAnalysis = safeParseJSON(fallbackResponse);
      }

      // Secondary model for cross-verification (Gemini Flash for speed)
      console.log("Starting secondary model verification (gemini-2.5-flash)...");
      let secondaryAnalysis: any = null;
      let modelAgreement: any = null;
      
      try {
        const secondaryPrompt = `Quickly analyze this image for authenticity. Is it: real, edited, or AI-generated?
Respond with JSON only:
{
  "verdict": "real" | "edited" | "ai_generated" | "suspicious",
  "confidence": 0-100,
  "keyReasons": ["reason1", "reason2", "reason3"]
}`;
        
        const secondaryResponse = await analyzeImageWithModel(
          LOVABLE_API_KEY,
          "google/gemini-2.5-flash",
          imageBase64,
          secondaryPrompt
        );
        secondaryAnalysis = safeParseJSON(secondaryResponse);
        console.log("Secondary analysis complete");

        // Calculate model agreement
        const verdictMatch = primaryAnalysis.imageVerdict === secondaryAnalysis.verdict;
        let agreementLevel: 'high' | 'medium' | 'low' = 'high';
        let confidenceAdjustment = "Models agree - high confidence";

        if (!verdictMatch) {
          const primaryIsReal = primaryAnalysis.imageVerdict === 'real';
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
          primaryVerdict: primaryAnalysis.imageVerdict,
          secondaryVerdict: secondaryAnalysis.verdict,
          agreementLevel,
          confidenceAdjustment
        };
      } catch (error) {
        console.error("Secondary model failed:", error);
        modelAgreement = {
          primaryVerdict: primaryAnalysis.imageVerdict,
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

      // Build the response
      const textAnalysis: TextAnalysis = {
        verdict: primaryAnalysis.verdict || (primaryAnalysis.imageVerdict === 'real' ? 'reliable' : 
                 primaryAnalysis.imageVerdict === 'suspicious' ? 'misleading' : 'fake'),
        reasons: primaryAnalysis.reasons || [],
        sensationalLanguage: [],
        emotionalPatterns: [],
      };

      const claimExtraction: ClaimExtraction = {
        mainClaim: primaryAnalysis.mainClaim || primaryAnalysis.description || "Image analysis",
        factCheckResult: primaryAnalysis.factCheckResult || 'unverified',
        sources: ['Multi-Model AI Analysis', 'Pixel-Level Inspection', 'Semantic Verification'],
      };

      const mediaVerification: MediaVerification = {
        description: primaryAnalysis.description || `Analyzed ${mediaDescription || 'uploaded image'}`,
        isReused: primaryAnalysis.analysisDetails?.crossMatchResults?.hasOnlineMatch || false,
        reusedFrom: primaryAnalysis.analysisDetails?.crossMatchResults?.possibleSources?.[0],
        manipulationDetected: primaryAnalysis.isManipulated || primaryAnalysis.isAiGenerated || false,
        matchesClaim: primaryAnalysis.imageVerdict === 'real',
        flags: [
          ...(primaryAnalysis.flags || []),
          ...(primaryAnalysis.manipulationSigns || []),
          ...(primaryAnalysis.aiGenerationSigns || []),
        ],
        authenticityScore: primaryAnalysis.authenticityScore,
        imageVerdict: primaryAnalysis.imageVerdict,
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
        explanation: primaryAnalysis.explanation || `Image classified as ${primaryAnalysis.imageVerdict}.`,
        timestamp: new Date().toISOString(),
      };

      console.log("Image verification complete, authenticity score:", primaryAnalysis.authenticityScore);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // Text-based analysis (existing logic)
      const textAnalysisPrompt = `You are a misinformation detection expert. Analyze the following content and classify it.

Content to analyze:
"""
${content}
"""
${feedbackContext}

Analyze this content and respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "verdict": "reliable" | "misleading" | "fake",
  "reasons": ["reason1", "reason2", ...],
  "sensationalLanguage": ["word1", "word2", ...],
  "emotionalPatterns": ["pattern1", "pattern2", ...],
  "mainClaim": "One sentence summary of the main claim",
  "factCheckResult": "confirmed" | "disputed" | "false" | "unverified",
  "credibilityScore": 0-100,
  "explanation": "A plain-English explanation of why this content has this credibility score"
}

Classification criteria:
- "reliable" (score 70-100): Factual, balanced language, verifiable claims
- "misleading" (score 40-69): Some errors, sensational language, missing context
- "fake" (score 0-39): False claims, manipulation, no credible sources`;

      messages = [
        { role: "system", content: "You are a misinformation detection expert. Always respond with valid JSON only." },
        { role: "user", content: textAnalysisPrompt }
      ];

      const textAnalysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
        }),
      });

      if (!textAnalysisResponse.ok) {
        const status = textAnalysisResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI analysis failed: ${status}`);
      }

      const aiData = await textAnalysisResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content;
      
      if (!aiContent) {
        throw new Error("No response from AI model");
      }

      let analysis;
      try {
        analysis = safeParseJSON(aiContent);
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        analysis = {
          verdict: "unverified" as const,
          reasons: ["Unable to fully analyze content"],
          sensationalLanguage: [],
          emotionalPatterns: [],
          mainClaim: content.substring(0, 100),
          factCheckResult: "unverified",
          credibilityScore: 50,
          explanation: "Analysis could not be completed."
        };
      }

      const textAnalysis: TextAnalysis = {
        verdict: analysis.verdict || 'misleading',
        reasons: analysis.reasons || [],
        sensationalLanguage: analysis.sensationalLanguage || [],
        emotionalPatterns: analysis.emotionalPatterns || [],
      };

      const claimExtraction: ClaimExtraction = {
        mainClaim: analysis.mainClaim || "Unable to extract main claim",
        factCheckResult: analysis.factCheckResult || 'unverified',
        sources: ['AI Analysis'],
      };

      const credibilityScore = analysis.credibilityScore ?? 
        (textAnalysis.verdict === 'reliable' ? 85 : 
         textAnalysis.verdict === 'misleading' ? 55 : 25);

      const result = {
        id: crypto.randomUUID(),
        credibilityScore,
        verdict: textAnalysis.verdict,
        textAnalysis,
        claimExtraction,
        explanation: analysis.explanation || `Content classified as ${textAnalysis.verdict}.`,
        timestamp: new Date().toISOString(),
      };

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
