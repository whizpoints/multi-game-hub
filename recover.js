const fs = require('fs');
const content = fs.readFileSync('C:/Users/Josphat Mburu/.gemini/antigravity/brain/de8bff50-c644-4593-8bef-147fb70b8be8/.system_generated/logs/transcript_full.jsonl', 'utf8');
const lines = content.split('\n');
for (const line of lines) {
    if (line.includes('joinGame')) {
        const obj = JSON.parse(line);
        if (obj.content && obj.content.includes('joinGame')) {
            fs.writeFileSync('server_original.js', obj.content);
            console.log('Saved to server_original.js');
            return;
        }
    }
}
