// Test script to call the Supabase Edge Function directly
const SUPABASE_URL = "https://gfbdkbjmddfjlmcllkxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmYmRrYmptZGRmamxtY2xsa3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDk3NzQsImV4cCI6MjA4Mzk4NTc3NH0.9dtwlhpCX18D7wcXtvnJ_r3eXAOhQE5fMIBl_bHBQAM";

async function testVerification() {
    console.log("Testing Edge Function...");

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                content: "The sky is blue",
                type: "text"
            })
        });

        console.log("Response status:", response.status);
        console.log("Response headers:", Object.fromEntries(response.headers.entries()));

        const data = await response.json();
        console.log("Response data:", JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.error("ERROR:", data);
        } else {
            console.log("SUCCESS:", data);
        }
    } catch (error) {
        console.error("Request failed:", error);
    }
}

testVerification();
