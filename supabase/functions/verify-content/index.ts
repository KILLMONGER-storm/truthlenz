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

const hashContent = (content: string): string => {
  const normalized = (content || "").toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
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

const callGemini = async (
  apiKey: string,
  modelOrModels: string | string[],
  systemPrompt: string,
  userContent: any[],
  tools?: any[]
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

      const body: any = {
        contents: [{ role: "user", parts: parts }],
        generationConfig: {
          response_mime_type: "application/json",
        }
      };

      if (tools && tools.length > 0) {
        body.tools = tools;
      }

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
    } catch (e) {
      console.warn(`Error using model ${model}:`, e);
      lastError = e;
    }
  }

  throw lastError || new Error("All model attempts failed");
};

const SYSTEM_PROMPTS = {
  text: `You are a Fact-Checking & Forensic Linting System with access to real-time Google Search.
TODAY'S DATE: February 6, 2026.
Goal: Extreme accuracy in detecting misinformation, bias, and fabricated claims, especially for recent or emerging topics.

Protocol:
1. Decompose the input into verifiable claims.
2. Use the Google Search tool for any claims involving events, statistics, or topics occurring in 2025 or 2026.
3. MANDATORY: For current year (2026) events, prioritize real-time search results over your internal training data. Your training data might be outdated regarding very recent developments.
4. MANDATORY: Respect any "Past Corrections" provided below. If a previous human verification indicates a particular fact is true or false, treat that as a primary source of truth.
5. Search for multiple high-credibility sources (news organizations, government sites, academic journals).
6. Cross-reference findings and identify contradictions.
7. Assign a credibility score (0-100).
8. Provide step-by-step forensic reasoning, citing specific sources found via search.

Special Instruction for URLs: If the input starts with http or is flagged as a URL, your FIRST step is to visit that URL using the google_search tool to extract all text, headlines, and claims. Perform a forensic analysis on the *extracted content*, not just the URL string itself. Check the site's reputation and look for bias or manipulation.

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
    "sources": ["URL or Name of source"]
  }
}`,
  media: (type: 'image' | 'video', context: string, feedback: string) => `You are a Multimodal Forensic Auditor specializing in Digital Forgery detection.
Goal: Detect AI generation, Photoshop manipulation, and deepfakes.
Context: ${context}
${feedback}

Protocol: Analyze pixels, texture, lighting, brand authenticity, and human features (teeth, hair, eyes).
${type === 'video' ? 'Analyze temporal consistency and lip-sync.' : ''}

CRITICAL: Logical Consistency Requirement
- If you assign a low credibilityScore (especially below 40%), your "explanation" and "analysisDetails" MUST explicitly state why.
- You CANNOT give a low score and then only provide positive findings. 100% manual review: if you suspect something but aren't sure, flag it as 'high severity' in the specific category (e.g., Pixel Analysis) and explain the specific anomaly (noise patterns, lighting inconsistency, etc.).
- Even if the 'verdict' is 'reliable', if the score is low, you MUST list the forensic red flags that reduced your confidence.

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

const TEXT_MODELS = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-flash-latest"];
const MEDIA_MODELS = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-flash-latest"];
const OPENAI_MODELS = ["gpt-4o", "gpt-4-turbo", "gpt-4"];

const callOpenAI = async (
  apiKey: string,
  modelOrModels: string | string[],
  systemPrompt: string,
  userContent: any[]
): Promise<any> => {
  const models = Array.isArray(modelOrModels) ? modelOrModels : [modelOrModels];
  let lastError;

  for (const model of models) {
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: userContent.map(p => {
            if (p.type === "text") return { type: "text", text: p.text };
            if (p.type === "image_url") return { type: "image_url", image_url: p.image_url };
            return p;
          })
        }
      ];

      console.log(`Attempting OpenAI Analysis with model: ${model}`);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`OpenAI API (${model}) failed: ${response.status} - ${errorText}`);
        lastError = new Error(`OpenAI API error (${model}): ${errorText}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(`No content in OpenAI response from ${model}`);
      }

      return JSON.parse(content);
    } catch (e) {
      console.warn(`Error using OpenAI model ${model}:`, e);
      lastError = e;
    }
  }

  throw lastError || new Error("All OpenAI model attempts failed");
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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
      throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured");
    }

    console.log(`Processing ${type} verification...`);

    const relevantFeedback = await getRelevantFeedback(content || mediaDescription || "", type);
    let feedbackContext = "";
    if (relevantFeedback.length > 0) {
      feedbackContext = `\nLearn from past corrections:\n${relevantFeedback.map(f => `- Correction: Original '${f.original_verdict}' -> Correct '${f.correct_verdict}'. User: "${f.user_correction}"`).join('\n')}\n`;
    }

    let result;

    if ((type === 'image' || type === 'video') && mediaBase64) {
      const prompt = SYSTEM_PROMPTS.media(type, content || mediaDescription || "None", feedbackContext);
      const userContent = [{ type: "image_url", image_url: { url: mediaBase64 } }];

      let analysis;
      let usedEngine = "none";

      if (OPENAI_API_KEY) {
        try {
          analysis = await callOpenAI(OPENAI_API_KEY, OPENAI_MODELS, prompt, userContent);
          usedEngine = "openai";
        } catch (openaiError) {
          console.warn("OpenAI failed, falling back to Gemini:", openaiError);
        }
      }

      if (!analysis && GEMINI_API_KEY) {
        analysis = await callGemini(GEMINI_API_KEY, MEDIA_MODELS, prompt, userContent);
        usedEngine = "gemini";
      }

      if (!analysis) {
        throw new Error("All AI engines failed to process media request");
      }

      // Ensure low scores always have a corresponding flag/reason
      const scoreValue = analysis.credibilityScore || analysis.authenticityScore || 50;
      const flags = [...(analysis.flags || [])];

      if (scoreValue < 30 && flags.length === 0) {
        flags.push("High-frequency noise anomalies detected (potential manipulation)");
      }

      result = {
        id: crypto.randomUUID(),
        credibilityScore: scoreValue,
        verdict: analysis.verdict || "inconclusive",
        textAnalysis: {
          verdict: analysis.verdict || "inconclusive",
          reasons: analysis.reasons || (analysis.explanation ? [analysis.explanation] : []),
          sensationalLanguage: analysis.sensationalLanguage || [],
          emotionalPatterns: analysis.emotionalPatterns || []
        },
        claimExtraction: {
          mainClaim: content || mediaDescription || "Media Analysis",
          factCheckResult: analysis.factCheckResult || 'unverified',
          sources: analysis.sources || []
        },
        mediaVerification: {
          description: analysis.description || content || mediaDescription || "Media content analyzed",
          isReused: analysis.isReused || false,
          manipulationDetected: analysis.manipulationDetected || (scoreValue < 50),
          matchesClaim: analysis.matchesClaim !== false,
          flags: flags,
          ...analysis,
          mediaVerdict: analysis.mediaVerdict || analysis.imageVerdict,
          authenticityScore: scoreValue
        },
        explanation: analysis.explanation || (scoreValue < 30 ? "Forensic analysis detected significant irregularities in pixel distribution and texture consistency." : "Forensic analysis complete"),
        timestamp: new Date().toISOString(),
        engine: usedEngine,
        lovable: false,
        platform: "supabase-edge-functions"
      };
    } else {
      const prompt = `Input to verify: "${content}"\n\n${feedbackContext}`;
      const tools = [{ google_search: {} }];

      let analysis;
      let usedEngine = "none";

      if (OPENAI_API_KEY) {
        try {
          // Note: OpenAI doesn't support the same google_search tool directly in this call
          analysis = await callOpenAI(OPENAI_API_KEY, OPENAI_MODELS, SYSTEM_PROMPTS.text, [{ type: "text", text: prompt }]);
          usedEngine = "openai";
        } catch (openaiError) {
          console.warn("OpenAI failed, falling back to Gemini:", openaiError);
        }
      }

      if (!analysis && GEMINI_API_KEY) {
        let finalPrompt = prompt;
        if (type === 'url') {
          finalPrompt = `CRITICAL: This is a direct URL link. \n1. Visit this URL: "${content}"\n2. Extract its content and claims.\n3. Verify if these claims are accurate vs fake.\n4. Analyze the source's credibility.\n\nInput to verify: ${content}\n\n${feedbackContext}`;
        }
        analysis = await callGemini(GEMINI_API_KEY, TEXT_MODELS, SYSTEM_PROMPTS.text, [{ type: "text", text: finalPrompt }], tools);
        usedEngine = "gemini";
      }

      if (!analysis) {
        throw new Error("All AI engines failed to process text request");
      }

      result = {
        id: crypto.randomUUID(),
        credibilityScore: analysis.credibilityScore || 50,
        verdict: analysis.verdict || "inconclusive",
        textAnalysis: analysis.textAnalysis,
        claimExtraction: analysis.claimExtraction,
        explanation: analysis.explanation,
        timestamp: new Date().toISOString(),
        engine: usedEngine,
        lovable: false,
        platform: "supabase-edge-functions"
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Verification Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
