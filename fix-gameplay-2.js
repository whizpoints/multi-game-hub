const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

game = game.replace(/socket\.on\('gameState', async \(state\) => \{/, 'async function handleGameState(state) {');
// The end of the block:
//     if (pendingGameState) {
//         const nState = pendingGameState;
//         pendingGameState = null;
//         socket.emit('requestStateSync'); // Or just handle it
//     }
// });

game = game.replace(/    if \(pendingGameState\) \{[\s\S]*?\}\);/, `    if (pendingGameState) {
        const nState = pendingGameState;
        pendingGameState = null;
        handleGameState(nState);
    }
}
socket.on('gameState', handleGameState);
`);

// Fix diceRolled
game = game.replace(/socket\.on\('diceRolled', \(data\) => {[\s\S]*?window\.addEventListener\('delayedGameState', \(e\) => {[\s\S]*?\}\);/, `socket.on('diceRolled', (data) => {
    die1El.classList.add('rolling');
    die2El.classList.add('rolling');
    
    isAnimatingHops = true; 
    
    setTimeout(() => {
        die1El.classList.remove('rolling');
        die2El.classList.remove('rolling');
        
        const rotMap = {
            1: 'rotateX(0deg) rotateY(0deg)',
            2: 'rotateX(0deg) rotateY(180deg)',
            3: 'rotateX(0deg) rotateY(90deg)',
            4: 'rotateX(0deg) rotateY(-90deg)',
            5: 'rotateX(90deg) rotateY(0deg)',
            6: 'rotateX(-90deg) rotateY(0deg)'
        };
        
        die1El.style.transform = rotMap[data.d1];
        die2El.style.transform = rotMap[data.d2];
        
        isAnimatingHops = false;
        if (pendingGameState) {
            const st = pendingGameState;
            pendingGameState = null;
            handleGameState(st);
        }
    }, 600);
});`);

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Fixed game.js');
