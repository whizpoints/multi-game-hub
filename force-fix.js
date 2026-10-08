const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const sIdx = game.indexOf("async function handleGameState(state) {");
const eIdx = game.indexOf("die1El.classList.add('rolling');");

if (sIdx !== -1 && eIdx !== -1) {
    const cleanBlock = `async function handleGameState(state) {
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

socket.on('diceRolled', (data) => {
    `;
    game = game.substring(0, sIdx) + cleanBlock + game.substring(eIdx);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Fixed handleGameState explicitly");
} else {
    console.log("Could not find boundaries");
}
