const fs = require('fs');
const content = fs.readFileSync('models_full.txt', 'utf8');
const lines = content.split('\n');
for (let line of lines) {
    if (line.includes('"name": "models/')) {
        console.log(line.trim());
    }
}
