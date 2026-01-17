import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = "https://gfbdkbjmddfjlmcllkxx.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = ""; // User needs to provide this or I use anon key for public function if verify_jwt is false

async function testVerification() {
    console.log("Testing text verification...");

    const textPayload = {
        content: "The Earth is flat and NASA is hiding the truth.",
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

        const result = await response.json();
        console.log("Text Verification Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Text Verification Failed:", error);
    }
}

testVerification();
