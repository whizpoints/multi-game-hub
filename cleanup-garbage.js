const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const sIdx = game.indexOf(" + (boardData[window.currentViewedTileIndex]");
if (sIdx !== -1) {
    const eIdx = game.indexOf("// Multiplayer Logic", sIdx);
    game = game.substring(0, sIdx) + game.substring(eIdx);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log('Cleaned up garbage');
}
