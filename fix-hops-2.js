const fs = require('fs');
let js = fs.readFileSync('public/monopoly/game.js', 'utf8');

const handleStateStr = `
async function handleGameState(state) {
    if (isAnimatingHops) {
        pendingGameState = state;
        return;
    }
    
    currentGameState = state;
    renderPlayersList(state);
    
    await animateHopsForState(state);
    
    renderBoardTokens(state);
    renderPropertyOwnership(state);
    updateControls(state);
    
    const me = state.players[myUuid];
    if (me && me.pendingAction && me.pendingAction.type === 'buy') {
        const pAction = me.pendingAction;
        const tData = boardData[pAction.tileIndex];
        if (!window.isPromptingBuy) {
            window.isPromptingBuy = true;
            Swal.fire({
                title: 'Buy Property?',
                text: tData.name + ' costs $' + pAction.price + '. Do you want to buy it?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Buy',
                cancelButtonText: 'Pass',
                confirmButtonColor: '#16a34a',
                cancelButtonColor: '#ef4444',
                background: '#ffffff',
                color: '#0f172a',
                customClass: { popup: 'glass-panel' }
            }).then((result) => {
                window.isPromptingBuy = false;
                socket.emit('buyProperty', result.isConfirmed);
            });
        }
    }
    
    if (pendingGameState) {
        const nState = pendingGameState;
        pendingGameState = null;
        handleGameState(nState);
    }
}
socket.on('gameState', handleGameState);
`;

js = js.replace(/socket\.on\('gameState', \(state\) => \{[\s\S]*?socket\.emit\('buyProperty', result\.isConfirmed\);\n            \}\);\n        \}\n    \}\n\}\);/, handleStateStr);

// Let's also fix diceRolled so it delays gameState
const diceRegex = /socket\.on\('diceRolled', \(data\) => \{[\s\S]*?\}, 500\);\n\}\);/;
const newDice = `socket.on('diceRolled', (data) => {
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
});`;

js = js.replace(diceRegex, newDice);

fs.writeFileSync('public/monopoly/game.js', js);
console.log('game.js updated successfully');
