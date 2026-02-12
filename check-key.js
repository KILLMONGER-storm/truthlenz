const apiKey = "AIzaSyCw9zEltsKXnLHNZC9ezoI1rLGm-gmNGy4";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

async function check() {
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
        });
        const data = await resp.json();
        if (resp.ok) {
            console.log("SUCCESS: Key is working!");
            console.log("Response:", JSON.stringify(data.candidates[0].content.parts[0].text));
        } else {
            console.log("FAIL:", resp.status);
            console.log("Error Detail:", JSON.stringify(data.error, null, 2));
        }
    } catch (e) {
        console.log("ERROR:", e.message);
    }
}

check();
