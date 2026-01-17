const fs = require('fs');
try {
    const content = fs.readFileSync('models_full.txt', 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
        if (line.includes('"name":')) {
            console.log(line.trim());
        }
    });
} catch (e) {
    console.error(e);
}
