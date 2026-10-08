const fs = require('fs');

const path = "C:/Users/Josphat Mburu/.gemini/antigravity/brain/de8bff50-c644-4593-8bef-147fb70b8be8/.system_generated/logs/transcript_full.jsonl";

const stream = fs.createReadStream(path, { encoding: 'utf8' });
let buffer = '';

stream.on('data', (chunk) => {
    buffer += chunk;
    let lines = buffer.split('\n');
    buffer = lines.pop(); // keep the last incomplete line
    
    for (let line of lines) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            if (obj.content && obj.content.includes("1. C:\\Users\\Josphat Mburu\\Documents\\codes\\ludo\\server.js") && obj.content.includes("socket.on('joinGame'")) {
                fs.writeFileSync('server_original_agent.txt', obj.content);
                console.log("FOUND!");
                process.exit(0);
            }
        } catch(e) {}
    }
});
stream.on('end', () => {
    console.log("EOF reached, not found");
});
