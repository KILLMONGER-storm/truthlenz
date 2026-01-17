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

    if ((type === 'image' || type === 'video') && mediaBase64) {
      const isVideo = type === 'video';
      const mediaAnalysisPrompt = isVideo ? `You are a video forensic analyst. Goal: accuracy.
${content ? `Context: "${content}"` : ''}
${mediaDescription ? `Filename: ${mediaDescription}` : ''}
${feedbackContext}
Analyze frames, physics, and audio. Detect deepfakes.
Respond with JSON:
{
  "mediaVerdict": "real" | "edited" | "ai_generated" | "suspicious" | "inconclusive",
  "authenticityScore": 0-100,
  "description": "Scientific description",
  "explanation": "Step-by-step reasoning",
  "analysisDetails": {
    "humanAnalysis": [{"category": "string", "finding": "string", "confidence": 0, "severity": "low"}],
    "audioAnalysis": [],
    "temporalAnalysis": [],
    "crossMatchResults": { "hasOnlineMatch": false, "matchConfidence": 0, "possibleSources": [] }
  },
  "flags": [],
  "isManipulated": false,
  "isAiGenerated": false,
  "isDeepfake": false,
  "verdict": "reliable" | "misleading" | "fake" | "inconclusive",
  "factCheckResult": "confirmed" | "disputed" | "false" | "unverified"
}` : `You are an image forensic expert. Goal: accuracy.
${content ? `Context: "${content}"` : ''}
${mediaDescription ? `Filename: ${mediaDescription}` : ''}
${feedbackContext}
Analyze pixels, lighting, shadows. Detect AI artifacts.
Respond with JSON:
{
  "mediaVerdict": "real" | "edited" | "ai_generated" | "suspicious" | "inconclusive",
  "authenticityScore": 0-100,
  "description": "Scientific description",
  "explanation": "Step-by-step reasoning",
  "analysisDetails": {
    "pixelAnalysis": [{"category": "string", "finding": "string", "confidence": 0, "severity": "low"}],
    "textureAnalysis": [],
    "semanticAnalysis": [],
    "brandAuthenticity": [],
    "humanAnalysis": []
  },
  "flags": [],
  "isManipulated": false,
  "isAiGenerated": false,
  "verdict": "reliable" | "misleading" | "fake" | "inconclusive",
  "factCheckResult": "confirmed" | "disputed" | "false" | "unverified"
}`;

      const userContent: any[] = [
        { type: "text", text: mediaAnalysisPrompt },
        { type: "image_url", image_url: { url: mediaBase64 } }
      ];

      if (mediaFeedbackExamples.length > 0) {
        userContent.push({ type: "text", text: "\nTRAINING EXAMPLES from past corrections:" });
        for (const example of mediaFeedbackExamples.slice(0, 2)) {
          userContent.push({ type: "image_url", image_url: { url: example.media } });
          userContent.push({ type: "text", text: `User correction: Should be ${example.correctVerdict}. Reason: ${example.correction}` });
        }
      }

      console.log(`Starting primary model analysis for ${type}...`);
      let primaryAnalysis;
      try {
        // Use stable and experimental models that support JSON mode
        primaryAnalysis = await callGemini(GEMINI_API_KEY, [
          "gemini-2.0-flash-exp",
          "gemini-1.5-pro",
          "gemini-1.5-flash",
          "gemini-1.5-pro-latest",
          "gemini-1.5-flash-latest"
        ],
          "You are a multimodal forensic verification system. Your goal is extreme accuracy. You MUST respond with a valid JSON object matching the requested schema.",
          userContent
        );
      } catch (e) {
        console.error("All media models failed:", e);
        throw e;
      }

      const mediaVerdict = primaryAnalysis.mediaVerdict || primaryAnalysis.imageVerdict || "inconclusive";

      const result = {
        id: crypto.randomUUID(),
        credibilityScore: primaryAnalysis.authenticityScore || 50,
        verdict: primaryAnalysis.verdict || "inconclusive",
        textAnalysis: { verdict: primaryAnalysis.verdict, reasons: [] },
        claimExtraction: { mainClaim: "Media Analysis", factCheckResult: primaryAnalysis.factCheckResult },
        mediaVerification: {
          ...primaryAnalysis,
          mediaVerdict,
          authenticityScore: primaryAnalysis.authenticityScore
        },
        explanation: primaryAnalysis.explanation || "Analysis complete",
        timestamp: new Date().toISOString()
      };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else {
      console.log("Starting web search verification with Gemini...");
      const searchPrompt = `Verify this claim via web search (Use Google Search tool implicitly if available, otherwise rely on internal knowledge but prefer real sources): "${content}"\nRespond with JSON: { verdict, credibilityScore, explanation, sources: [] }`;

      const analysis = await callGemini(GEMINI_API_KEY, [
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
        "gemini-1.5-flash",
        "gemini-2.0-flash-exp",
        "gemini-pro"
      ],
        "You are a Fact Checker. Verify the claim. Respond with JSON.",
        [{ type: "text", text: searchPrompt }]
      );

      const result = {
        id: crypto.randomUUID(),
        credibilityScore: analysis.credibilityScore || 50,
        verdict: analysis.verdict || "misleading",
        textAnalysis: analysis,
        claimExtraction: { mainClaim: content, factCheckResult: analysis.verdict === 'reliable' ? 'confirmed' : 'unverified' },
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
