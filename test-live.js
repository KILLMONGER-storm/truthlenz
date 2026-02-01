import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let supabaseUrl = process.env.VITE_SUPABASE_URL;

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

const url = `${supabaseUrl}/functions/v1/verify-content`;

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
