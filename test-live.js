const url = "https://gfbdkbjmddfjlmcllkxx.supabase.co/functions/v1/verify-content";
// Use anon key from .env (I'll hardcode it here for speed from the viewed .env file earlier)
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmYmRrYmptZGRmamxtY2xsa3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDk3NzQsImV4cCI6MjA4Mzk4NTc3NH0.9dtwlhpCX18D7wcXtvnJ_r3eXAOhQE5fMIBl_bHBQAM";

async function testLive() {
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${anonKey}`
            },
            body: JSON.stringify({
                content: "Testing live endpoint for model availability.",
                type: "text"
            })
        });

        const data = await resp.json();
        console.log("Status:", resp.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

testLive();
