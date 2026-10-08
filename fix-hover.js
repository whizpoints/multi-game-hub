const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// Reset to previous state first (undo my messy replace)
game = game.replace(/function xupdateControls\(state\) \{ try \{/g, 'function updateControls(state) {');
game = game.replace(/socket\.on\('gameState', async \(state\) => \{ try \{/g, "socket.on('gameState', async (state) => {");

// Add proper error logging
const wrapper = `
window.addEventListener('error', function(event) {
    fetch('/log-error?msg=' + encodeURIComponent('Uncaught: ' + event.message + ' at ' + event.filename + ':' + event.lineno));
});
window.addEventListener('unhandledrejection', function(event) {
    fetch('/log-error?msg=' + encodeURIComponent('Unhandled Rejection: ' + (event.reason ? event.reason.stack || event.reason : '')));
});
`;

if (!game.includes('Uncaught: ')) {
    game = game.replace(/window\.addEventListener\('error'[\s\S]*?\}\);/, wrapper);
}

// Fix the hover bug identified in Issue 1
game = game.replace(/const idx = parseInt\(tile\.id\.replace\('tile-', ''\), 10\);/g, "const idx = boardData.indexOf(tile);");

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Fixed hover bug and added verbose error tracking');
