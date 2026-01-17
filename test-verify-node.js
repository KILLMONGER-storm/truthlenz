const SUPABASE_URL = "https://gfbdkbjmddfjlmcllkxx.supabase.co";

async function testVerification() {
    console.log("Testing text verification via Node.js...");

    const textPayload = {
        content: "Breaking: Scientists discover that the Moon is made of green cheese.",
        type: "text"
    };

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(textPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error ${response.status}: ${errorText}`);
            return;
        }

        const result = await response.json();
        console.log("Text Verification Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Text Verification Failed:", error);
    }
}

testVerification();
