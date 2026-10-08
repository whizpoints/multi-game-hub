const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const vars = `
let visualPositions = {};
let isAnimatingHops = false;
let pendingGameState = null;
`;

// Insert after myUuid declaration
game = game.replace(/let myUuid = localStorage\.getItem\('uuid'\);/, vars + "\nlet myUuid = localStorage.getItem('uuid');");

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Restored missing globals');
