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

interface MediaVerification {
  description: string;
  isReused: boolean;
  reusedFrom?: string;
  manipulationDetected: boolean;
  matchesClaim: boolean;
  flags: string[];
}

interface FeedbackRecord {
  original_content: string;
  original_verdict: string;
  correct_verdict: string;
  user_correction: string;
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
const getRelevantFeedback = async (content: string): Promise<FeedbackRecord[]> => {
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
      .select('original_content, original_verdict, correct_verdict, user_correction')
      .eq('content_hash', contentHash)
      .eq('is_correct', false)
      .not('user_correction', 'is', null)
      .limit(3);
    
    if (exactMatches && exactMatches.length > 0) {
      return exactMatches;
    }
    
    // Get recent corrections to learn from (last 20 corrections)
    const { data: recentFeedback } = await supabase
      .from('verification_feedback')
      .select('original_content, original_verdict, correct_verdict, user_correction')
      .eq('is_correct', false)
      .not('user_correction', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    return recentFeedback || [];
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return [];
  }
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

    // Fetch relevant feedback to include in the AI prompt
    const relevantFeedback = await getRelevantFeedback(content);
    let feedbackContext = "";
    
    if (relevantFeedback.length > 0) {
      feedbackContext = `

IMPORTANT: Learn from these user corrections on similar content:
${relevantFeedback.map((f, i) => `
Correction ${i + 1}:
- Original AI verdict: ${f.original_verdict}
- User said correct verdict should be: ${f.correct_verdict}
- User's explanation: "${f.user_correction}"
`).join('\n')}

Use these corrections to improve your analysis and avoid similar mistakes.`;
      console.log(`Including ${relevantFeedback.length} feedback records for AI training`);
    }

    // Build messages array based on content type
    let messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
    
    if (type === 'image' && imageBase64) {
      // Use vision capabilities for image analysis
      const imageAnalysisPrompt = `You are a misinformation and fake image detection expert. Analyze this image carefully.

${content ? `Context provided by user: "${content}"` : 'No additional context provided.'}
${mediaDescription ? `Filename: ${mediaDescription}` : ''}
${feedbackContext}

Analyze this image for:
1. Signs of digital manipulation (artifacts, inconsistent lighting, unnatural edges, AI-generated patterns)
2. Whether this appears to be a real photograph or AI-generated/manipulated
3. Any text visible in the image and whether it appears authentic
4. Whether the image could be misleading or taken out of context
5. Any recognizable elements that could help verify authenticity

Respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "verdict": "reliable" | "misleading" | "fake",
  "reasons": ["reason1", "reason2", ...],
  "sensationalLanguage": [],
  "emotionalPatterns": [],
  "mainClaim": "Description of what the image shows and any claims it makes",
  "factCheckResult": "confirmed" | "disputed" | "false" | "unverified",
  "credibilityScore": 0-100,
  "explanation": "A plain-English explanation of the image analysis",
  "imageAnalysis": {
    "description": "Detailed description of what the image shows",
    "isManipulated": true/false,
    "manipulationSigns": ["sign1", "sign2"],
    "isAiGenerated": true/false,
    "aiGenerationSigns": ["sign1", "sign2"],
    "contextIssues": ["issue1", "issue2"]
  }
}`;

      messages = [
        { 
          role: "system", 
          content: "You are an expert at detecting fake, manipulated, and AI-generated images. Always respond with valid JSON only, no markdown formatting." 
        },
        { 
          role: "user", 
          content: [
            { type: "text", text: imageAnalysisPrompt },
            { type: "image_url", image_url: { url: imageBase64 } }
          ]
        }
      ];
    } else {
      // Text-based analysis
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
- "reliable" (score 70-100): Factual, balanced language, verifiable claims, credible sources
- "misleading" (score 40-69): Some factual errors, sensational language, missing context
- "fake" (score 0-39): False claims, heavy manipulation, no credible sources

Look for:
- Sensational language (shocking, breaking, you won't believe, etc.)
- Emotional manipulation (outrage, fear, anger-inducing phrases)
- Unverified claims or lack of sources
- Excessive punctuation or capitalization
- Logical fallacies or conspiracy language`;

      messages = [
        { role: "system", content: "You are a misinformation detection expert. Always respond with valid JSON only, no markdown formatting." },
        { role: "user", content: textAnalysisPrompt }
      ];
    }

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
      const imageAnalysis = analysis.imageAnalysis;
      mediaVerification = {
        description: imageAnalysis?.description || mediaDescription || `Uploaded ${type} content`,
        isReused: false,
        reusedFrom: undefined,
        manipulationDetected: imageAnalysis?.isManipulated || imageAnalysis?.isAiGenerated || false,
        matchesClaim: true,
        flags: [
          ...(imageAnalysis?.manipulationSigns || []),
          ...(imageAnalysis?.aiGenerationSigns || []),
          ...(imageAnalysis?.contextIssues || []),
        ],
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
