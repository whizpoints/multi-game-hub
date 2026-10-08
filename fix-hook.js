const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const hookStr = `// Hook into handleGameState to update currentGameState
const origHandleGameState = handleGameState;
handleGameState = function(state) {
    currentGameState = state;
    origHandleGameState(state);
    
    // Check if it's my turn to draw a card
    const me = state.players[myUuid];
    const chanceDeck = document.querySelector('.chance-deck');
    const chestDeck = document.querySelector('.chest-deck');
    
    if (chanceDeck) chanceDeck.classList.remove('glow-deck');
    if (chestDeck) chestDeck.classList.remove('glow-deck');
    
    if (me && me.pendingAction && me.pendingAction.type === 'draw_card') {
        const targetDeck = document.querySelector('.' + me.pendingAction.deck + '-deck');
        if (targetDeck) {
            targetDeck.classList.add('glow-deck');
        }
    }
};`;

game = game.replace(hookStr, "");
fs.writeFileSync('public/monopoly/game.js', game);
console.log("Removed broken handleGameState hook.");
