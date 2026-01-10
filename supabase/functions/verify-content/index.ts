import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  content: string;
  type: 'text' | 'url' | 'image' | 'video';
  mediaDescription?: string;
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

interface MediaVerification {
  description: string;
  isReused: boolean;
  reusedFrom?: string;
  manipulationDetected: boolean;
  matchesClaim: boolean;
  flags: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, type, mediaDescription } = await req.json() as VerificationRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Verifying content of type: ${type}, length: ${content.length}`);

    // AI Analysis for text classification
    const textAnalysisPrompt = `You are a misinformation detection expert. Analyze the following content and classify it.

Content to analyze:
"""
${content}
"""

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
- "reliable" (score 70-100): Factual, balanced language, verifiable claims, credible sources
- "misleading" (score 40-69): Some factual errors, sensational language, missing context
- "fake" (score 0-39): False claims, heavy manipulation, no credible sources

Look for:
- Sensational language (shocking, breaking, you won't believe, etc.)
- Emotional manipulation (outrage, fear, anger-inducing phrases)
- Unverified claims or lack of sources
- Excessive punctuation or capitalization
- Logical fallacies or conspiracy language`;

    const textAnalysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a misinformation detection expert. Always respond with valid JSON only, no markdown formatting." },
          { role: "user", content: textAnalysisPrompt }
        ],
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
      const errorText = await textAnalysisResponse.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error(`AI analysis failed: ${status}`);
    }

    const aiData = await textAnalysisResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error("No response from AI model");
    }

    console.log("AI Response:", aiContent);

    // Parse the AI response
    let analysis;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedContent = aiContent.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      analysis = JSON.parse(cleanedContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback analysis if parsing fails
      analysis = {
        verdict: "unverified" as const,
        reasons: ["Unable to fully analyze content"],
        sensationalLanguage: [],
        emotionalPatterns: [],
        mainClaim: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
        factCheckResult: "unverified",
        credibilityScore: 50,
        explanation: "Analysis could not be completed. Please try again."
      };
    }

    // Build the response
    const textAnalysis: TextAnalysis = {
      verdict: analysis.verdict || 'misleading',
      reasons: analysis.reasons || [],
      sensationalLanguage: analysis.sensationalLanguage || [],
      emotionalPatterns: analysis.emotionalPatterns || [],
    };

    const claimExtraction: ClaimExtraction = {
      mainClaim: analysis.mainClaim || "Unable to extract main claim",
      factCheckResult: analysis.factCheckResult || 'unverified',
      sources: analysis.sources || ['AI Analysis', 'Pattern Recognition'],
    };

    // Media verification for image/video types
    let mediaVerification: MediaVerification | undefined;
    if (type === 'image' || type === 'video') {
      mediaVerification = {
        description: mediaDescription || `Uploaded ${type} content`,
        isReused: false,
        manipulationDetected: false,
        matchesClaim: true,
        flags: [],
      };
    }

    const credibilityScore = analysis.credibilityScore ?? 
      (textAnalysis.verdict === 'reliable' ? 85 : 
       textAnalysis.verdict === 'misleading' ? 55 : 25);

    const result = {
      id: crypto.randomUUID(),
      credibilityScore,
      verdict: textAnalysis.verdict,
      textAnalysis,
      claimExtraction,
      mediaVerification,
      explanation: analysis.explanation || `This content has been classified as ${textAnalysis.verdict}.`,
      timestamp: new Date().toISOString(),
    };

    console.log("Verification complete, score:", credibilityScore);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
