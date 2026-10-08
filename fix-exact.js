const fs = require('fs');
let content = fs.readFileSync('public/monopoly/game.js', 'utf8');

// Find the index of "// if (!player.online)"
const start = content.indexOf('// if (!player.online) {');
if (start !== -1) {
    const endStr = '}';
    const end = content.indexOf(endStr, start);
    content = content.substring(0, start) + content.substring(end + 1);
    fs.writeFileSync('public/monopoly/game.js', content);
    console.log("Fixed!");
} else {
    console.log("Not found.");
}
