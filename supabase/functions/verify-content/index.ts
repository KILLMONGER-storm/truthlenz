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
      normalized = (url.protocol + '//' + url.host + url.pathname).replace(/\/$/, '');
    } catch (_e) {
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
  // @ts-ignore: crypto is global in Deno
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

const getRelevantFeedback = async (content: string, contentType: string): Promise<FeedbackRecord[]> => {
  try {
    // @ts-ignore: Deno is global
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore: Deno is global
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) return [];

    const supabase = createClient(supabaseUrl, supabaseKey);
    const normalizedContent = (contentType === 'image' || contentType === 'video') ? content : normalizeInput(content, contentType);
    const contentHash = await generateHash(normalizedContent);

    const { data: exactMatches } = await supabase
      .from('verification_feedback')
      .select('original_content, original_verdict, correct_verdict, user_correction, content_type, image_base64')
      .eq('content_hash', contentHash)
      .eq('is_correct', false)
      .not('user_correction', 'is', null)
      .limit(3);

    if (exactMatches && exactMatches.length > 0) return exactMatches;

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
        generationConfig: { response_mime_type: "application/json" }
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
        lastError = new Error(`API error (${model}): ${errorText}`);
        continue;
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error(`No content from ${model}`);

      let cleaned = content.trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];

      return JSON.parse(cleaned);
    } catch (e: any) {
      console.warn(`Error using model ${model}:`, e);
      lastError = e;
    }
  }

  throw lastError || new Error("All models failed");
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

Protocol: Analyze pixels, texture, lighting, brand authenticity, and human features.
Respond ONLY with valid JSON:
{
  "verdict": "reliable" | "misleading" | "fake" | "inconclusive",
  "credibilityScore": number,
  "explanation": "string",
  "mediaVerdict": "real" | "edited" | "ai_generated" | "suspicious" | "inconclusive",
  "description": "string",
  "analysisDetails": {
    "pixelAnalysis": [{"category": "Pixel", "finding": "string", "confidence": 0-1, "severity": "low"}],
    "textureAnalysis": [],
    "semanticAnalysis": [],
    "brandAuthenticity": [],
    "humanAnalysis": []
  },
  "flags": ["string"],
  "factCheckResult": "confirmed" | "disputed" | "false" | "unverified"
}`
};

const TEXT_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
const MEDIA_MODELS = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"];

// @ts-ignore: Deno.serve is the modern entry point
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 7 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Payload too large (>7MB)" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const requestData = await req.json() as VerificationRequest;
    const { content, type, mediaDescription } = requestData;
    const mediaBase64 = requestData.mediaBase64 || requestData.imageBase64;

    // @ts-ignore: Deno is global
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore: Deno is global
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // @ts-ignore: Deno is global
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("geminiapikey");

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

    const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

    const inputToHash = (type === 'image' || type === 'video') ? (mediaBase64 || "") : (content || "");
    const normalizedInput = (type === 'image' || type === 'video') ? inputToHash : normalizeInput(inputToHash, type);
    const contentHash = await generateHash(normalizedInput);

    if (supabase) {
      try {
        const { data: cached, error } = await supabase.from('verification_cache').select('api_response').eq('content_hash', contentHash).maybeSingle();
        if (!error && cached) {
          console.log("Cache hit!");
          supabase.rpc('increment_cache_hit', { target_hash: contentHash }).catch(() => { });
          return new Response(JSON.stringify(cached.api_response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (e) {
        console.warn("Cache error:", e);
      }
    }

    const feedback = await getRelevantFeedback(content || mediaDescription || "", type);
    const feedbackCtx = feedback.length > 0 ? `\nFeedback:\n${feedback.map(f => `- ${f.user_correction}`).join('\n')}\n` : "";

    let result;
    if ((type === 'image' || type === 'video') && mediaBase64) {
      const prompt = SYSTEM_PROMPTS.media(type, content || mediaDescription || "None", feedbackCtx);
      const userContent = [{ type: "image_url", image_url: { url: mediaBase64 } }];
      const analysis = await callGemini(GEMINI_API_KEY, MEDIA_MODELS, prompt, userContent);

      result = {
        id: crypto.randomUUID(),
        credibilityScore: analysis.credibilityScore || 50,
        verdict: analysis.verdict || "inconclusive",
        textAnalysis: { verdict: analysis.verdict, reasons: [] },
        claimExtraction: { mainClaim: content || "Media", factCheckResult: analysis.factCheckResult || 'unverified' },
        mediaVerification: { ...analysis, mediaVerdict: analysis.mediaVerdict || analysis.imageVerdict },
        timestamp: new Date().toISOString(),
        engine: "supabase", platform: "supabase-edge-functions"
      };
    } else {
      const prompt = `Verify: "${content}"\n${feedbackCtx}`;
      const analysis = await callGemini(GEMINI_API_KEY, TEXT_MODELS, SYSTEM_PROMPTS.text, [{ type: "text", text: prompt }]);

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

    if (supabase) {
      const storageInput = (type === 'text' || type === 'article') && normalizedInput.length > 1000 ? normalizedInput.substring(0, 1000) : (type === 'image' || type === 'video' ? `[Media]` : normalizedInput);
      await supabase.from('verification_cache').insert({ content_hash: contentHash, content_type: type, original_input: storageInput, api_response: result }).catch(() => { });
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Critical Error:", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
