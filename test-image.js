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

// A tiny 1x1 base64 transparent gif for testing
const base64Image = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

async function testImage() {
    try {
        console.log("Testing Image Verification...");
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${anonKey}`
            },
            body: JSON.stringify({
                type: "image",
                imageBase64: base64Image
            })
        });

        const text = await resp.text();
        let logOutput = `Status: ${resp.status}\n`;
        try {
            logOutput += `Response: ${JSON.stringify(JSON.parse(text), null, 2)}\n`;
        } catch (e) {
            logOutput += `Response (Raw): ${text}\n`;
        }
        console.log(logOutput);
        fs.writeFileSync('image-error.log', logOutput);
    } catch (e) {
        console.error("Error:", e);
    }
}

testImage();
