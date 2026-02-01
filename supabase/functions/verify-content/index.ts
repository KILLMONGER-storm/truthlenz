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
  mediaUrl?: string; // Sometimes sent by frontend
}

interface FeedbackRecord {
  original_content: string;
  original_verdict: string;
  correct_verdict: string;
  user_correction: string;
  content_type: string;
  image_base64?: string;
}

// --------------------------------------------------------------------------------
// UTILITIES
// --------------------------------------------------------------------------------

const extractMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : "image/jpeg";
};

// Simple hash for feedback matching
const generateSimpleHash = (content: string): string => {
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
    // @ts-ignore: Deno global
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore: Deno global
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) return [];

    const supabase = createClient(supabaseUrl, supabaseKey);
    const contentHash = generateSimpleHash(content);

    // Try to get exact matches
    const { data: exactMatches } = await supabase
      .from('verification_feedback')
      .select('original_content, original_verdict, correct_verdict, user_correction, content_type, image_base64')
      .eq('content_hash', contentHash)
      .eq('is_correct', false)
      .not('user_correction', 'is', null)
      .limit(3);

    if (exactMatches && exactMatches.length > 0) return exactMatches;

    // Fallback to recent corrections for this content type
    const { data: recentFeedback } = await supabase
      .from('verification_feedback')
      .select('original_content, original_verdict, correct_verdict, user_correction, content_type, image_base64')
      .eq('is_correct', false)
      .eq('content_type', contentType)
      .not('user_correction', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    return recentFeedback || [];
  } catch (error) {
    console.error("Feedback lookup error:", error);
    return [];
  }
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

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: { response_mime_type: "application/json" }
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini ${model} error ${response.status}: ${text}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");

      let cleaned = text.trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) cleaned = match[0];

      return JSON.parse(cleaned);
    } catch (e: any) {
      console.warn(`Model ${model} failed:`, e.message);
      lastError = e;
    }
  }
  throw lastError || new Error("All AI models failed");
};

// --------------------------------------------------------------------------------
// PROMPTS
// --------------------------------------------------------------------------------

const SYSTEM_PROMPTS = {
  text: `Analyze this content for misinformation and sensational language. Provide step-by-step forensic reasoning. Respond ONLY with valid JSON.
{
  "verdict": "reliable" | "misleading" | "fake",
  "credibilityScore": number,
  "explanation": "string",
  "textAnalysis": { "verdict": "string", "reasons": ["string"], "sensationalLanguage": ["string"], "emotionalPatterns": ["string"] },
  "claimExtraction": { "mainClaim": "string", "factCheckResult": "confirmed" | "disputed" | "false", "sources": ["string"] }
}`,
  media: (type: string, context: string, feedback: string) => `Analyze this ${type} for AI generation or digital manipulation. Context: ${context}. ${feedback}. Respond ONLY with valid JSON.
{
  "verdict": "reliable" | "fake",
  "credibilityScore": number,
  "explanation": "string",
  "mediaVerdict": "real" | "edited" | "ai_generated",
  "analysisDetails": { "pixelAnalysis": [], "textureAnalysis": [], "semanticAnalysis": [] },
  "factCheckResult": "confirmed" | "false"
}`
};

// --------------------------------------------------------------------------------
// SERVER
// --------------------------------------------------------------------------------

// @ts-ignore: Deno.serve is modern entry
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data = await req.json() as VerificationRequest;
    const { content, type, mediaDescription, mediaBase64 } = data;
    const activeMediaBase64 = mediaBase64 || (data as any).imageBase64;

    // @ts-ignore: Deno global
    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("geminiapikey");
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing from Supabase Secrets");

    console.log(`Verifying: ${type}`);

    const feedback = await getRelevantFeedback(content || mediaDescription || "", type);
    const feedbackStr = feedback.length > 0
      ? `\nLessons from corrections:\n${feedback.map(f => `- ${f.user_correction}`).join('\n')}\n`
      : "";

    let result;
    if ((type === 'image' || type === 'video') && activeMediaBase64) {
      const prompt = SYSTEM_PROMPTS.media(type, content || mediaDescription || "None", feedbackStr);
      const analysis = await callGemini(apiKey, ["gemini-1.5-pro", "gemini-1.5-flash"], prompt, [{ type: "image_url", image_url: { url: activeMediaBase64 } }]);

      result = {
        id: crypto.randomUUID(),
        credibilityScore: analysis.credibilityScore || 50,
        verdict: analysis.verdict || "inconclusive",
        textAnalysis: { verdict: analysis.verdict, reasons: [] },
        claimExtraction: { mainClaim: content || "Media", factCheckResult: analysis.factCheckResult || 'unverified' },
        mediaVerification: { ...analysis, mediaVerdict: analysis.mediaVerdict || analysis.imageVerdict },
        explanation: analysis.explanation || "Analysis complete",
        timestamp: new Date().toISOString(),
        engine: "supabase", platform: "supabase-edge-functions"
      };
    } else {
      const prompt = `Verify: "${content}"\n${feedbackStr}`;
      const analysis = await callGemini(apiKey, ["gemini-1.5-flash", "gemini-1.5-pro"], SYSTEM_PROMPTS.text, [{ type: "text", text: prompt }]);

      result = {
        id: crypto.randomUUID(),
        credibilityScore: analysis.credibilityScore || 50,
        verdict: analysis.verdict || "inconclusive",
        textAnalysis: analysis.textAnalysis,
        claimExtraction: analysis.claimExtraction,
        explanation: analysis.explanation,
        timestamp: new Date().toISOString(),
        engine: "supabase", platform: "supabase-edge-functions"
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Critical Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, details: "Please check your Gemini API Key or project configuration." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
