const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const targetStr = "const fullscreenBtn = document.getElementById('fullscreen-btn');";
const firstIdx = game.indexOf(targetStr);
const secondIdx = game.indexOf(targetStr, firstIdx + 1);

if (firstIdx !== -1 && secondIdx !== -1) {
    game = game.substring(0, secondIdx);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Truncated duplicates");
} else {
    console.log("No duplicates found");
}
