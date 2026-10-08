const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const startStr = "if (me && me.pendingAction && me.pendingAction.type === 'draw_card') {";
const endStr = "if (me && me.pendingAction && me.pendingAction.type === 'buy') {";

const startIdx = game.indexOf(startStr);
const endIdx = game.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
    game = game.substring(0, startIdx) + game.substring(endIdx);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Successfully removed popup block.");
} else {
    console.log("Could not find the block.");
}
