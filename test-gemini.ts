const apiKey = "AIzaSyD7IrfMrb0t5Xc5VIGg5HAwMi4vvHQDDY8";
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
