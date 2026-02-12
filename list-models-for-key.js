const apiKey = "AIzaSyCw9zEltsKXnLHNZC9ezoI1rLGm-gmNGy4";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (resp.ok) {
            console.log("SUCCESS: Key is working!");
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("FAIL:", resp.status);
            console.log("Error Detail:", JSON.stringify(data.error, null, 2));
        }
    } catch (e) {
        console.log("ERROR:", e.message);
    }
}

listModels();
