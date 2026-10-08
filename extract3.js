const fs = require('fs');
const line = fs.readFileSync('server_recovered.txt', 'utf8');
const obj = JSON.parse(line);
if (obj.content) {
    fs.writeFileSync('server_recovered.txt', obj.content);
    console.log("Extracted content!");
} else if (obj.tool_calls) {
    for (const tc of obj.tool_calls) {
        if (tc.arguments && tc.arguments.CodeContent) {
             fs.writeFileSync('server_recovered.txt', tc.arguments.CodeContent);
             console.log("Extracted from tool_calls!");
        }
    }
}
