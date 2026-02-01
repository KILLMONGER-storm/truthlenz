import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser to avoid checking for dotenv dependency
let apiKey = process.env.GEMINI_API_KEY;
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GEMINI_API_KEY="([^"]+)"/);
        if (match) apiKey = match[1];
    }
} catch (e) { }

if (!apiKey) {
    console.error("Error: GEMINI_API_KEY not found in .env or environment variables.");
    process.exit(1);
}
const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-pro", "gemini-2.0-flash-exp"];
const versions = ["v1beta", "v1"];

async function testAll() {
    for (const v of versions) {
        for (const m of models) {
            const url = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`;
            try {
                const resp = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
                });
                const data = await resp.json();
                if (resp.ok) {
                    console.log(`SUCCESS: ${v}/${m}`);
                    process.exit(0);
                } else {
                    console.log(`FAIL ${v}/${m}: ${data.error?.message || resp.status}`);
                }
            } catch (e) {
                console.log(`ERROR ${v}/${m}: ${e.message}`);
            }
        }
    }
}

testAll();
