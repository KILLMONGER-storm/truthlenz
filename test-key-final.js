const apiKey = "AIzaSyCw9zEltsKXnLHNZC9ezoI1rLGm-gmNGy4";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function verify() {
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (resp.ok) {
            console.log("SUCCESS: Gemini key is working!");
            console.log(`Key has access to ${data.models.length} models.`);
            const coreModels = data.models
                .map(m => m.name.replace('models/', ''))
                .filter(name => name.includes('1.5-flash') || name.includes('pro') || name.includes('2.0'));
            console.log("Core models available:", coreModels.slice(0, 5).join(', '));
        } else {
            console.log("FAIL:", resp.status, data.error?.message);
        }
    } catch (e) {
        console.log("ERROR:", e.message);
    }
}

verify();
