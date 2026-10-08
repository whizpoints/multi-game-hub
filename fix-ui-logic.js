const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// 1. Remove the failed hook
const failedHookStart = "// Hook into handleGameState";
const failedHookEnd = "    if (chestDeck) chestDeck.addEventListener('click', clickHandler);\n});";
const startIndex = game.indexOf(failedHookStart);
const endIndex = game.indexOf(failedHookEnd);
if (startIndex !== -1 && endIndex !== -1) {
    game = game.substring(0, startIndex) + game.substring(endIndex + failedHookEnd.length);
}

// 2. Inject into updateControls
const targetUpdateStr = "rollBtn.disabled = false;\n    } else {";
const updateInjection = `
        if (currentPlayer && currentPlayer.pendingAction && currentPlayer.pendingAction.type === 'draw_card') {
            rollBtn.textContent = 'DRAW CARD';
            rollBtn.style.background = '#ef4444';
            rollBtn.classList.add('pulse-anim');
            
            // Add glow to physical deck
            const targetDeck = document.querySelector('.' + currentPlayer.pendingAction.deck + '-deck');
            if (targetDeck) targetDeck.classList.add('glow-deck');
        } else {
            rollBtn.classList.remove('pulse-anim');
            const chanceDeck = document.querySelector('.chance-deck');
            const chestDeck = document.querySelector('.chest-deck');
            if (chanceDeck) chanceDeck.classList.remove('glow-deck');
            if (chestDeck) chestDeck.classList.remove('glow-deck');
        }
        rollBtn.disabled = false;
    } else {`;

game = game.replace(targetUpdateStr, updateInjection);

// 3. Make rollBtn trigger resolveCard if clicked while "DRAW CARD"
const rollBtnTarget = "socket.emit('rollDice');";
const rollBtnReplacement = `
    if (rollBtn.textContent === 'DRAW CARD') {
        socket.emit('resolveCard');
        rollBtn.classList.remove('pulse-anim');
        const chanceDeck = document.querySelector('.chance-deck');
        const chestDeck = document.querySelector('.chest-deck');
        if (chanceDeck) chanceDeck.classList.remove('glow-deck');
        if (chestDeck) chestDeck.classList.remove('glow-deck');
    } else {
        socket.emit('rollDice');
    }
`;
if (!game.includes("rollBtn.textContent === 'DRAW CARD'")) {
    game = game.replace(/rollBtn\.addEventListener\('click',\s*\(\)\s*=>\s*\{\s*socket\.emit\('rollDice'\);\s*\}\);/, 
        "rollBtn.addEventListener('click', () => { " + rollBtnReplacement + " });");
}

// 4. Also keep the physical deck click handlers, using monopolyState (which we can capture in gameState)
const stateCaptureTarget = "currentGameState = state;\n    renderPlayersList(state);";
const stateCaptureReplacement = "window.currentGameStateObj = state;\n    renderPlayersList(state);";
game = game.replace("currentGameState = state;\n    renderPlayersList(state);", stateCaptureReplacement);

const clickHandlerFix = `
document.addEventListener('DOMContentLoaded', () => {
    const chanceDeck = document.querySelector('.chance-deck');
    const chestDeck = document.querySelector('.chest-deck');
    
    const clickHandler = (e) => {
        if (!window.currentGameStateObj) return;
        const me = window.currentGameStateObj.players[myUuid];
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
`;
if (!game.includes("window.currentGameStateObj")) {
    game += "\n" + clickHandlerFix;
}

// pulse animation css
if (!game.includes("pulse-anim")) {
    game += `\nconst pulseStyle = document.createElement('style');
pulseStyle.textContent = \`
@keyframes pulseBtn {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}
.pulse-anim { animation: pulseBtn 1.5s infinite; }
\`;
document.head.appendChild(pulseStyle);\n`;
}

fs.writeFileSync('public/monopoly/game.js', game);
console.log("Fixed game UI logic for draw card.");
