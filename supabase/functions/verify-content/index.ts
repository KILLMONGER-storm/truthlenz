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

const hashContent = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

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

const extractMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : "image/jpeg";
};

// Call Gemini API directly (with fallback support)
const callGemini = async (
  apiKey: string,
  modelOrModels: string | string[],
  systemPrompt: string,
  userContent: any[]
): Promise<any> => {
  const models = Array.isArray(modelOrModels) ? modelOrModels : [modelOrModels];
  let lastError;

  for (const model of models) {
    try {
      // Merge system prompt into user content as the first part for maximum compatibility
      const parts = [
        { text: systemPrompt },
        ...userContent.map(p => {
          if (p.type === "text") return { text: p.text };
          if (p.type === "image_url") {
            const mimeType = extractMimeType(p.image_url.url);
            const base64Data = p.image_url.url.split(",")[1] || p.image_url.url;
            console.log(`Media segment detected: ${mimeType}, size: ${base64Data.length} chars`);
            return { inline_data: { mime_type: mimeType, data: base64Data } };
          }
          return p;
        })
      ];

      const body = {
        contents: [{ role: "user", parts: parts }],
        generationConfig: {
          response_mime_type: "application/json",
        }
      };

      console.log(`Attempting Gemini Analysis with model: ${model} (JSON mode)`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Gemini API (${model}) failed: ${response.status} - ${errorText}`);
        lastError = new Error(`API error (${model}): ${errorText}`);
        continue;
      }

      const data = await response.json();
      if (data.error) {
        console.warn(`Gemini API error data for ${model}:`, JSON.stringify(data.error));
        lastError = new Error(`Gemini Error (${model}): ${data.error.message}`);
        continue;
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        console.warn(`Empty response from ${model}. Full response:`, JSON.stringify(data));
        throw new Error(`No content in Gemini response from ${model}`);
      }

      let cleaned = content.trim();
      // Aggressive JSON extraction from potential markdown
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      return JSON.parse(cleaned);
    } catch (e) {
      console.warn(`Error using model ${model}:`, e);
      lastError = e;
    }
  }

  throw lastError || new Error("All model attempts failed");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json() as VerificationRequest;
    const { content, type, mediaDescription } = requestData;
    const mediaBase64 = requestData.mediaBase64 || requestData.imageBase64;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("geminiapikey");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log(`Verifying content of type: ${type}, length: ${content.length}, hasMedia: ${!!mediaBase64}`);

    const relevantFeedback = await getRelevantFeedback(content, type);
    let feedbackContext = "";

    const mediaFeedbackExamples: Array<{ media: string; correction: string; correctVerdict: string; mediaType: string }> = [];
    if (relevantFeedback.length > 0) {
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
      feedbackContext = `\nIMPORTANT: Learn from these user corrections on similar content:\n${relevantFeedback.map((f, i) => `- Correction: Original verdict '${f.original_verdict}' was wrong. Correct: '${f.correct_verdict}'. User explanation: "${f.user_correction}"`).join('\n')}\n`;
    }

    // System prompts for different modalities
    const SYSTEM_PROMPTS = {
      text: `You are a Fact-Checking & Forensic Linting System. 
Goal: Extreme accuracy in detecting misinformation, bias, and fabricated claims.
Protocol:
1. Decompose the input into verifiable claims.
2. Cross-reference claims against your internal high-accuracy knowledge base (representing official records, peer-reviewed news, and established facts).
3. Analyze language for "Sensationalism", "Emotional Manipulation", and "Logical Fallacies".
4. Assign a credibility score (0-100) where 100 is indisputable truth and 0 is complete fabrication.
5. Provide a step-by-step forensic reasoning.

Respond ONLY with a valid JSON object:
{
  "verdict": "reliable" | "misleading" | "fake" | "inconclusive",
  "credibilityScore": number,
  "explanation": "concise reasoning",
  "textAnalysis": {
    "verdict": "reliable" | "misleading" | "fake",
    "reasons": ["string"],
    "sensationalLanguage": ["string"],
    "emotionalPatterns": ["string"]
  },
  "claimExtraction": {
    "mainClaim": "string",
    "factCheckResult": "confirmed" | "disputed" | "false" | "unverified",
    "sources": ["string"]
  }
}`,
      media: (type: 'image' | 'video', context?: string, feedback?: string) => `You are a Multimodal Forensic Auditor specializing in Digital Forgery detection.
Goal: Detect AI generation, Photoshop manipulation, and deepfakes.
Context: ${context || 'None'}
${feedback || ''}

Protocol:
1. Category: Pixel Analysis (Artifacts, Noise, Compression)
2. Category: Texture Analysis (Skin realism, Porosity, GAN artifacts)
3. Category: Semantic Analysis (Lighting consistency, Shadow vectors, Physics)
4. Category: Brand/Entity Authenticity (Deformation in logos/text)
5. Category: Human Analysis (Eyes, Teeth, Hair, Fingernails)
${type === 'video' ? '6. Category: Temporal Analysis (Frame consistency, lip-sync, identity drift)' : ''}

Strict Rule: Treat "Highly Realistic" as "Highly Suspicious".
Score 0-40: FAKE/AI
Score 40-75: EDITED/SUSPICIOUS
Score 75-100: REAL

Respond ONLY with a valid JSON object matching this schema:
{
  "verdict": "reliable" | "misleading" | "fake" | "inconclusive",
  "credibilityScore": number,
  "explanation": "step-by-step forensic reasoning",
  "mediaVerdict": "real" | "edited" | "ai_generated" | "suspicious" | "inconclusive",
  "description": "scientific description of findings",
  "analysisDetails": {
    "pixelAnalysis": [{"category": "Pixel Analysis", "finding": "string", "confidence": 0-1, "severity": "low" | "medium" | "high"}],
    "textureAnalysis": [],
    "semanticAnalysis": [],
    "brandAuthenticity": [],
    "humanAnalysis": [],
    ${type === 'video' ? '"temporalAnalysis": [], "frameConsistency": [],' : ''}
    "modelAgreement": {
      "primaryVerdict": "string",
      "secondaryVerdict": "string",
      "agreementLevel": "high" | "medium" | "low"
    }
  },
  "flags": ["string"],
  "factCheckResult": "confirmed" | "disputed" | "false" | "unverified"
}`
    };

    // Advanced Gemini models based on models_utf8.json
    const TEXT_MODELS = [
      "gemini-3-flash-preview",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "gemini-1.5-pro"
    ];

    const MEDIA_MODELS = [
      "gemini-2.5-pro",
      "gemini-3-pro-image-preview",
      "gemini-2.5-flash",
      "gemini-2.0-flash-exp",
      "gemini-1.5-pro"
    ];

    serve(async (req) => {
      if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      try {
        const requestData = await req.json() as VerificationRequest;
        const { content, type, mediaDescription } = requestData;
        const mediaBase64 = requestData.mediaBase64 || requestData.imageBase64;

        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("geminiapikey");
        if (!GEMINI_API_KEY) {
          throw new Error("GEMINI_API_KEY is not configured");
        }

        console.log(`Verifying content of type: ${type}, length: ${content.length}, hasMedia: ${!!mediaBase64}`);

        const relevantFeedback = await getRelevantFeedback(content, type);
        let feedbackContext = "";

        if (relevantFeedback.length > 0) {
          feedbackContext = `\nIMPORTANT: Learn from these user corrections on similar content:\n${relevantFeedback.map((f) => `- Correction: Original verdict '${f.original_verdict}' was wrong. Correct: '${f.correct_verdict}'. User explanation: "${f.user_correction}"`).join('\n')}\n`;
        }

        if ((type === 'image' || type === 'video') && mediaBase64) {
          const mediaAnalysisPrompt = SYSTEM_PROMPTS.media(type, content || mediaDescription, feedbackContext);

          const userContent: any[] = [
            { type: "image_url", image_url: { url: mediaBase64 } }
          ];

          // Add feedback examples as context if they have media
          for (const f of relevantFeedback.slice(0, 2)) {
            if (f.image_base64) {
              userContent.push({ type: "text", text: `PAST CORRECTION: Should be ${f.correct_verdict}. Reason: ${f.user_correction}` });
              userContent.push({ type: "image_url", image_url: { url: f.image_base64 } });
            }
          }

          console.log(`Starting primary model analysis for ${type}...`);
          const analysis = await callGemini(GEMINI_API_KEY, MEDIA_MODELS, mediaAnalysisPrompt, userContent);

          const result = {
            id: crypto.randomUUID(),
            credibilityScore: analysis.credibilityScore || analysis.authenticityScore || 50,
            verdict: analysis.verdict || "inconclusive",
            textAnalysis: { verdict: analysis.verdict, reasons: [] },
            claimExtraction: { mainClaim: content || "Media Analysis", factCheckResult: analysis.factCheckResult || 'unverified' },
            mediaVerification: {
              ...analysis,
              mediaVerdict: analysis.mediaVerdict || analysis.imageVerdict,
              authenticityScore: analysis.credibilityScore || analysis.authenticityScore
            },
            explanation: analysis.explanation || "Analysis complete",
            timestamp: new Date().toISOString()
          };

          return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } else {
          console.log("Starting text verification analysis...");
          const textAnalysisPrompt = `Input Content to Verify: "${content}"\n\n${feedbackContext}`;

          const analysis = await callGemini(GEMINI_API_KEY, TEXT_MODELS, SYSTEM_PROMPTS.text, [{ type: "text", text: textAnalysisPrompt }]);

          const result = {
            id: crypto.randomUUID(),
            credibilityScore: analysis.credibilityScore || 50,
            verdict: analysis.verdict || "misleading",
            textAnalysis: analysis.textAnalysis,
            claimExtraction: analysis.claimExtraction,
            explanation: analysis.explanation,
            timestamp: new Date().toISOString()
          };

          return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

      } catch (error) {
        console.error("Error:", error);
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : "Verification failed" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    });
