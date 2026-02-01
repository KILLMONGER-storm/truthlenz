import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let apiKey = process.env.GEMINI_API_KEY;
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GEMINI_API_KEY="([^"]+)"/);
        if (match) apiKey = match[1];
    }
} catch (e) { }
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (!resp.ok) {
            console.error("Error:", JSON.stringify(data, null, 2));
        } else {
            const models = data.models
                .filter(m => m.supportedGenerationMethods.includes("generateContent"))
                .map(m => `- ${m.name} (${m.version})`)
                .join('\n');
            console.log(models);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

listModels();
