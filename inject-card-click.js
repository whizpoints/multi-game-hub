const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const injection = `
// ====== CARD CLICK LOGIC ======
let currentGameState = null;

// Hook into handleGameState to update currentGameState
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
};

document.addEventListener('DOMContentLoaded', () => {
    const chanceDeck = document.querySelector('.chance-deck');
    const chestDeck = document.querySelector('.chest-deck');
    
    const clickHandler = (e) => {
        if (!currentGameState) return;
        const me = currentGameState.players[myUuid];
        if (!me || !me.pendingAction || me.pendingAction.type !== 'draw_card') return;
        
        const deckType = me.pendingAction.deck;
        if (e.currentTarget.classList.contains(deckType + '-deck')) {
            socket.emit('resolveCard');
            e.currentTarget.classList.remove('glow-deck');
        }
    };
    
    if (chanceDeck) chanceDeck.addEventListener('click', clickHandler);
    if (chestDeck) chestDeck.addEventListener('click', clickHandler);
});

socket.on('cardDrawn', (data) => {
    // Show the card temporarily in the center of the board
    let display = document.getElementById('card-display-overlay');
    if (!display) {
        display = document.createElement('div');
        display.id = 'card-display-overlay';
        display.style.position = 'absolute';
        display.style.top = '50%';
        display.style.left = '50%';
        display.style.transform = 'translate(-50%, -50%) scale(0.5)';
        display.style.width = '260px';
        display.style.height = '160px';
        display.style.background = 'white';
        display.style.border = '4px solid #0f172a';
        display.style.borderRadius = '16px';
        display.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        display.style.display = 'flex';
        display.style.alignItems = 'center';
        display.style.justifyContent = 'center';
        display.style.padding = '20px';
        display.style.textAlign = 'center';
        display.style.fontSize = '1.2rem';
        display.style.fontWeight = 'bold';
        display.style.color = '#0f172a';
        display.style.zIndex = '1000';
        display.style.opacity = '0';
        display.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        display.style.pointerEvents = 'none'; // click through
        document.querySelector('.board').appendChild(display);
    }
    
    display.textContent = data.text;
    
    // Animate in
    setTimeout(() => {
        display.style.opacity = '1';
        display.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 50);
    
    // Animate out
    setTimeout(() => {
        display.style.opacity = '0';
        display.style.transform = 'translate(-50%, -50%) scale(0.5)';
    }, 3000);
});

// Add CSS for glowing deck
const style = document.createElement('style');
style.textContent = \`
    .glow-deck {
        box-shadow: 0 0 20px 10px rgba(239, 68, 68, 0.6) !important;
        transform: scale(1.05);
        cursor: pointer;
        z-index: 50;
    }
    .chest-deck.glow-deck {
        box-shadow: 0 0 20px 10px rgba(59, 130, 246, 0.6) !important;
    }
    .deck { transition: all 0.2s; }
\`;
document.head.appendChild(style);
`;

if (!game.includes('CARD CLICK LOGIC')) {
    game += '\n' + injection;
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log('Injected frontend card logic');
}
