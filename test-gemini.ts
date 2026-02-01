// Note: This script expects the API key to be available via Deno.env or similar if run in that context,
// or you should assume it's set in the environment. For safety, we remove the hardcoded key.
// If running with Node, this might need dotenv. For now, placeholders to preventing leaking.
const apiKey = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE";
const model = "gemini-1.5-flash";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const body = {
  contents: [{ parts: [{ text: "Hello, reply with 'READY'" }] }]
};

try {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  console.log(JSON.stringify(data, null, 2));
} catch (e) {
  console.error(e);
}
