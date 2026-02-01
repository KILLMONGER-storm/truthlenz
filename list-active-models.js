const apiKey = "AIzaSyDpmKIrshja4aOU5jDYo2b-S40iYW9VVDw";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (!resp.ok) {
            console.error("Error:", JSON.stringify(data, null, 2));
        } else {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name} (${m.version})`);
                }
            });
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

listModels();
