const fs = require('fs');
try {
    // Try reading as UTF-8 first, then UTF-16LE
    let content;
    try {
        content = fs.readFileSync('models_full.txt', 'utf8');
    } catch (e) {
        content = fs.readFileSync('models_full.txt', 'utf16le');
    }

    const matches = content.match(/"name":\s*"models\/gemini-[^"]+"/g);
    if (matches) {
        matches.forEach(m => console.log(m));
    } else {
        console.log("No gemini models found in file.");
    }
} catch (e) {
    console.error(e);
}
