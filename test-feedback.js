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

async function testFeedback() {
    console.log("Attempting to insert simulated user feedback...");
    const { data, error } = await supabase
        .from('verification_feedback')
        .insert({
            content_hash: 'test_hash_' + Date.now(),
            original_content: 'Uploaded image: test.png',
            content_type: 'image',
            original_verdict: 'fake',
            original_score: 15,
            is_correct: true,
            user_correction: null,
            correct_verdict: null,
            image_base64: null
        });

    if (error) {
        console.error("Error inserting feedback:", error);
    } else {
        console.log("Successfully inserted simulated feedback:", data);
    }
}

testFeedback();
