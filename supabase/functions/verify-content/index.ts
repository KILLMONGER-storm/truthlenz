declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  content: string;
  type: 'text' | 'url' | 'image' | 'video' | 'article';
  mediaDescription?: string;
  mediaBase64?: string;
  mediaUrl?: string;
  imageBase64?: string;
}

interface ImageInspectionDetail {
  category: string;
  finding: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
}

interface FeedbackRecord {
  original_content: string;
  original_verdict: string;
  correct_verdict: string;
  user_correction: string;
  content_type: string;
  image_base64?: string;
}

const normalizeInput = (input: string, type: string): string => {
  let normalized = input.trim().replace(/\s+/g, ' ');

  if (type === 'url') {
    try {
      const url = new URL(normalized.toLowerCase());
      // Remove trailing slash
      normalized = (url.protocol + '//' + url.host + url.pathname).replace(/\/$/, '');
    } catch (e: any) {
      normalized = normalized.toLowerCase().replace(/\/$/, '');
    }
  } else if (type === 'text' || type === 'article') {
    normalized = normalized.toLowerCase();
  }

  return normalized;
};

const generateHash = async (content: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
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
    const normalizedContent = contentType === 'image' || contentType === 'video' ? content : normalizeInput(content, contentType);
    const contentHash = await generateHash(normalizedContent);

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
  } catch (error: any) {
    console.error("Error fetching feedback:", error);
    return [];
  }
};

const extractMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : "image/jpeg";
};

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
      const parts = [
        { text: systemPrompt },
        ...userContent.map(p => {
          if (p.type === "text") return { text: p.text };
          if (p.type === "image_url") {
            const dataUrl = p.image_url.url;
            const mimeType = extractMimeType(dataUrl);
            const base64Data = dataUrl.split(",")[1] || dataUrl;
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

      console.log(`Attempting Gemini Analysis with model: ${model}`);
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
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error(`No content in Gemini response from ${model}`);
      }

      let cleaned = content.trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      return JSON.parse(cleaned);
    } catch (e: any) {
      console.warn(`Error using model ${model}:`, e);
      lastError = e;
    }
  }

  throw lastError || new Error("All model attempts failed");
};

const SYSTEM_PROMPTS = {
  text: `You are a Fact-Checking & Forensic Linting System. 
Goal: Extreme accuracy in detecting misinformation, bias, and fabricated claims.
Protocol:
1. Decompose the input into verifiable claims.
2. Cross-reference against your high-accuracy knowledge base.
3. Analyze language for sensationalism and emotional manipulation.
4. Assign a credibility score (0-100).
5. Provide step-by-step forensic reasoning.

Respond ONLY with valid JSON:
{
  "verdict": "reliable" | "misleading" | "fake" | "inconclusive",
  "credibilityScore": number,
  "explanation": "string",
  "textAnalysis": {
    "verdict": "string",
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
  media: (type: 'image' | 'video', context: string, feedback: string) => `You are a Multimodal Forensic Auditor specializing in Digital Forgery detection.
Goal: Detect AI generation, Photoshop manipulation, and deepfakes.
Context: ${context}
${feedback}

Protocol: Analyze pixels, texture, lighting, brand authenticity, and human features (teeth, hair, eyes).
${type === 'video' ? 'Analyze temporal consistency and lip-sync.' : ''}

Respond ONLY with valid JSON:
{
  "verdict": "reliable" | "misleading" | "fake" | "inconclusive",
  "credibilityScore": number,
  "explanation": "string",
  "mediaVerdict": "real" | "edited" | "ai_generated" | "suspicious" | "inconclusive",
  "description": "string",
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

const TEXT_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
const MEDIA_MODELS = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 0. Payload size check for stability
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 7 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Payload too large. Please upload an image/video under 7MB." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData = await req.json() as VerificationRequest;
    const { content, type, mediaDescription } = requestData;
    const mediaBase64 = requestData.mediaBase64 || requestData.imageBase64;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("geminiapikey");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

    // 1. Normalize and Hash
    const inputToHash = (type === 'image' || type === 'video') ? (mediaBase64 || "") : (content || "");
    const normalizedInput = (type === 'image' || type === 'video') ? inputToHash : normalizeInput(inputToHash, type);
    const contentHash = await generateHash(normalizedInput);

    console.log(`Processing ${type} verification with hash: ${contentHash}`);

    // 2. Cache Lookup
    if (supabase) {
      try {
        const { data: cachedResult, error: cacheError } = await supabase
          .from('verification_cache')
          .select('api_response')
          .eq('content_hash', contentHash)
          .maybeSingle();

        if (cacheError) {
          console.warn("Cache lookup error (table might not exist yet):", cacheError.message);
        } else if (cachedResult) {
          console.log("Cache hit! Returning stored result.");
          // Increment hit count asynchronously
          supabase.rpc('increment_cache_hit', { target_hash: contentHash }).catch((e: any) => {
            console.error("Failed to increment hit count:", e);
          });

          return new Response(JSON.stringify(cachedResult.api_response), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e: any) {
        console.warn("Cache logic failed gracefully:", e);
      }
    }

    const relevantFeedback = await getRelevantFeedback(content || mediaDescription || "", type);
    let feedbackContext = "";
    if (relevantFeedback.length > 0) {
      feedbackContext = `\nLearn from past corrections:\n${relevantFeedback.map(f => `- Correction: Original '${f.original_verdict}' -> Correct '${f.correct_verdict}'. User: "${f.user_correction}"`).join('\n')}\n`;
    }

    let result;

    if ((type === 'image' || type === 'video') && mediaBase64) {
      const prompt = SYSTEM_PROMPTS.media(type, content || mediaDescription || "None", feedbackContext);
      const userContent = [{ type: "image_url", image_url: { url: mediaBase64 } }];

      const analysis = await callGemini(GEMINI_API_KEY, MEDIA_MODELS, prompt, userContent);

      result = {
        id: crypto.randomUUID(),
        credibilityScore: analysis.credibilityScore || 50,
        verdict: analysis.verdict || "inconclusive",
        textAnalysis: { verdict: analysis.verdict, reasons: [] },
        claimExtraction: { mainClaim: content || "Media Analysis", factCheckResult: analysis.factCheckResult || 'unverified' },
        mediaVerification: {
          ...analysis,
          mediaVerdict: analysis.mediaVerdict || analysis.imageVerdict,
          authenticityScore: analysis.credibilityScore || analysis.authenticityScore
        },
        explanation: analysis.explanation || "Forensic analysis complete",
        timestamp: new Date().toISOString(),
        engine: "supabase",
        lovable: false,
        platform: "supabase-edge-functions"
      };
    } else {
      const prompt = `Input to verify: "${content}"\n\n${feedbackContext}`;
      const analysis = await callGemini(GEMINI_API_KEY, TEXT_MODELS, SYSTEM_PROMPTS.text, [{ type: "text", text: prompt }]);

      result = {
        id: crypto.randomUUID(),
        credibilityScore: analysis.credibilityScore || 50,
        verdict: analysis.verdict || "inconclusive",
        textAnalysis: analysis.textAnalysis,
        claimExtraction: analysis.claimExtraction,
        explanation: analysis.explanation,
        timestamp: new Date().toISOString(),
        engine: "supabase",
        lovable: false,
        platform: "supabase-edge-functions"
      };
    }

    // 3. Store in Cache
    if (supabase) {
      try {
        const storageInput = (type === 'text' || type === 'article') && normalizedInput.length > 1000
          ? normalizedInput.substring(0, 1000)
          : (type === 'image' || type === 'video' ? `[Media: ${type}]` : normalizedInput);

        const { error: insertError } = await supabase
          .from('verification_cache')
          .insert({
            content_hash: contentHash,
            content_type: type,
            original_input: storageInput,
            api_response: result
          });

        if (insertError) {
          console.warn("Error caching result:", insertError.message);
        }
      } catch (e: any) {
        console.warn("Cache storage failed gracefully:", e);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Verification Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal Server Error",
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
