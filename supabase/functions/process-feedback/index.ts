import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackSubmission {
    content: string;
    contentType: string;
    originalVerdict: string;
    originalScore: number;
    isCorrect: boolean;
    userCorrection?: string;
    correctVerdict?: string;
    imageBase64?: string;
}

const callGemini = async (
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    tools?: any[]
): Promise<any> => {
    try {
        const parts = [
            { text: systemPrompt },
            { text: userPrompt }
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
            throw new Error(`Gemini API error: ${errorText}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
            throw new Error(`No content in Gemini response`);
        }

        let cleaned = content.trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }

        return JSON.parse(cleaned);
    } catch (e) {
        console.error(`Error calling Gemini:`, e);
        throw e;
    }
};

const SYSTEM_PROMPT = `
You are a Feedback Validator for a Fact-Checking system called TruthLenz.
Your goal is to determine if a user's correction to an AI-generated verdict is factually true or false.

Protocol:
1. Analyze the original content and the AI's original verdict.
2. Carefully evaluate the user's correction claim.
3. Use your internal knowledge and logic to determine if the user's correction is:
   - "true": The user is correct and the AI was likely wrong.
   - "false": The user is incorrect, lying, or providing malicious/unhelpful feedback.
4. If the feedback is "Correct Result" (isCorrect: true), verify if it seems like a genuine, safe validation or spam.

Respond ONLY with valid JSON:
{
  "isTrue": boolean,
  "reasoning": "string",
  "confidence": number (0-1)
}
`;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const feedback = await req.json() as FeedbackSubmission;
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("geminiapikey");

        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured");
        }

        console.log(`Processing feedback for content type: ${feedback.contentType}...`);

        let isValid = true;
        let validationReason = "Directly accepted (positive feedback)";

        // Only fact-check if there's a correction
        if (!feedback.isCorrect && feedback.userCorrection) {
            const userPrompt = `
Original Content: "${feedback.content}"
Original AI Verdict: ${feedback.originalVerdict}
AI Credibility Score: ${feedback.originalScore}%
User's Correction: "${feedback.userCorrection}"
User's Proposed Verdict: ${feedback.correctVerdict}

Is the user's correction factually true?
      `;

            const validation = await callGemini(
                GEMINI_API_KEY,
                "gemini-2.0-flash-exp",
                SYSTEM_PROMPT,
                userPrompt
            );

            isValid = validation.isTrue;
            validationReason = validation.reasoning;
            console.log(`Validation result: ${isValid ? 'VALID' : 'INVALID'}. Reason: ${validationReason}`);
        } else if (feedback.isCorrect) {
            // basic check for spam in positive feedback if content is provided
            if (feedback.content && feedback.content.length > 500) {
                // maybe just log it for now
                console.log("Positive feedback for long content received.");
            }
        }

        if (isValid) {
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
            const supabase = createClient(supabaseUrl!, supabaseKey!);

            // Simple hash implementation for the edge function
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

            const contentHash = hashContent(feedback.content || 'no-content');
            const imageBase64ForStorage = feedback.imageBase64 && feedback.imageBase64.length < 700000
                ? feedback.imageBase64
                : undefined;

            const { error } = await supabase
                .from('verification_feedback')
                .insert({
                    content_hash: contentHash,
                    original_content: (feedback.content || 'No content provided').substring(0, 5000),
                    content_type: feedback.contentType || 'text',
                    original_verdict: feedback.originalVerdict || 'inconclusive',
                    original_score: Math.round(feedback.originalScore || 50),
                    is_correct: feedback.isCorrect,
                    user_correction: feedback.userCorrection || null,
                    correct_verdict: feedback.correctVerdict || null,
                    image_base64: imageBase64ForStorage || null,
                });

            if (error) {
                console.error('Supabase insertion error:', error);
                throw new Error('Failed to save feedback to database');
            }

            return new Response(JSON.stringify({ success: true, message: "Feedback verified and saved." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        } else {
            console.warn(`Feedback rejected: ${validationReason}`);
            return new Response(JSON.stringify({ success: false, message: "Feedback rejected after fact-checking.", reason: validationReason }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

    } catch (error) {
        console.error("Process Feedback Error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
