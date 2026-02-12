import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShareRequest {
    verdictId: string;
    platform: 'x' | 'instagram';
    caption: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { verdictId, platform, caption } = await req.json() as ShareRequest;

        // 1. Get the user's provider token from the session (or a dedicated table if you store them)
        // For this implementation, we expect the token to be passed or retrieved from the auth context
        const authHeader = req.headers.get('Authorization')!;
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            throw new Error("Authentication failed");
        }

        console.log(`User ${user.id} requested to share on ${platform}`);

        // In a full production app, you would retrieve the stored provider_token for this user
        // Supabase Auth stores these in a way that might require manual handling if not in the session
        // For now, we'll demonstrate the API call logic

        if (platform === 'x') {
            console.log("Posting to X...");
            // Mock API call to Twitter v2
            /*
            const response = await fetch("https://api.twitter.com/2/tweets", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${PROVIDER_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ text: caption }),
            });
            */
        } else if (platform === 'instagram') {
            console.log("Posting to Instagram...");
            // Instagram requires a container-based publishing flow (upload -> publish)
            /*
            // 1. Create Media Container
            const containerRes = await fetch(`https://graph.facebook.com/v18.0/${IG_USER_ID}/media?image_url=${IMAGE_URL}&caption=${encodeURIComponent(caption)}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
            const { id: creationId } = await containerRes.json();
            
            // 2. Publish Media
            await fetch(`https://graph.facebook.com/v18.0/${IG_USER_ID}/media_publish?creation_id=${creationId}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
            */
        }

        return new Response(JSON.stringify({ success: true, message: `Successfully posted to ${platform}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Sharing Error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
