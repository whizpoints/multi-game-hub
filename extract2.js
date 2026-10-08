const fs = require('fs');
const path = require('path');

const brainDir = "C:/Users/Josphat Mburu/.gemini/antigravity/brain";

function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (let f of files) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            searchDir(full);
        } else if (f === 'transcript_full.jsonl') {
            const content = fs.readFileSync(full, 'utf8');
            if (content.includes("socket.on('joinGame'")) {
                const lines = content.split('\n');
                for (let l of lines) {
                    if (l.includes("socket.on('joinGame'")) {
                        console.log("Found in: " + full);
                        fs.writeFileSync('server_recovered.txt', l);
                        return;
                    }
                }
            }
        }
    }
}
searchDir(brainDir);
