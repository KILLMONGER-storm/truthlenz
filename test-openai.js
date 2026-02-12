import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser
let apiKey = process.env.OPENAI_API_KEY;
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/OPENAI_API_KEY="([^"]+)"/);
        if (match) apiKey = match[1];
    }
} catch (e) { }

if (!apiKey) {
    console.error("Error: OPENAI_API_KEY not found in .env or environment variables.");
    process.exit(1);
}

const models = ["gpt-4o", "gpt-4-turbo", "gpt-4"];

async function testOpenAI() {
    for (const m of models) {
        console.log(`Testing model: ${m}...`);
        try {
            const resp = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: m,
                    messages: [
                        { role: "system", content: "You are a test assistant." },
                        { role: "user", content: "Hi" }
                    ],
                    max_tokens: 5
                })
            });
            const data = await resp.json();
            if (resp.ok) {
                console.log(`SUCCESS with ${m}: ${data.choices[0].message.content}`);
                // Stop after first success if that's what we want, but let's check gpt-4o specifically
                if (m === "gpt-4o") break;
            } else {
                console.log(`FAIL ${m}: ${data.error?.message || resp.status}`);
            }
        } catch (e) {
            console.log(`ERROR ${m}: ${e.message}`);
        }
    }
}

testOpenAI();
