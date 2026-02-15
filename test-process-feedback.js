import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let anonKey = "";
let supabaseUrl = "";

try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const matchKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);
        if (matchKey) anonKey = matchKey[1];
        const matchUrl = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/);
        if (matchUrl) supabaseUrl = matchUrl[1];
    }
} catch (e) { }

if (!anonKey || !supabaseUrl) {
    console.error("Missing VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_URL in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function testFeedbackLogic() {
    console.log("--- Testing Feedback Fact-Checking Algorithm ---");

    const testCases = [
        {
            name: "Positive (Correct) Feedback",
            payload: {
                content: "The sky is blue.",
                contentType: "text",
                originalVerdict: "reliable",
                originalScore: 95,
                isCorrect: true
            }
        },
        {
            name: "Valid Correction",
            payload: {
                content: "Elon Musk bought Twitter in 2022.",
                contentType: "text",
                originalVerdict: "fake",
                originalScore: 10,
                isCorrect: false,
                userCorrection: "This is true, he acquired it for $44 billion in October 2022.",
                correctVerdict: "reliable"
            }
        },
        {
            name: "Invalid (False) Correction",
            payload: {
                content: "The Earth is roughly a sphere.",
                contentType: "text",
                originalVerdict: "reliable",
                originalScore: 99,
                isCorrect: false,
                userCorrection: "The Earth is actually flat and held up by four elephants.",
                correctVerdict: "fake"
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`\nTesting: ${testCase.name}...`);
        try {
            const { data, error } = await supabase.functions.invoke('process-feedback', {
                body: testCase.payload
            });

            if (error) {
                console.error(`Error calling function:`, error);
                continue;
            }

            console.log(`Response:`, data);
        } catch (e) {
            console.error(`Unexpected error for ${testCase.name}:`, e);
        }
    }
}

testFeedbackLogic();
