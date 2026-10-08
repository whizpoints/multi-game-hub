const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const sIdx = game.indexOf("// Multiplayer Logic");
if (sIdx !== -1) {
    // Keep everything up to the first Multiplayer Logic
    const head = game.substring(0, sIdx);
    
    // Find where the last block ends (or just extract one block)
    // Actually, I can just extract the one block manually, it's just the socket listeners.
    // Let's just find the very LAST instance of "// Multiplayer Logic"
    const lastIdx = game.lastIndexOf("// Multiplayer Logic");
    const tail = game.substring(lastIdx);
    
    game = head + tail;
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log('Removed duplicate blocks');
}
