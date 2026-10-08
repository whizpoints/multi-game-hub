import sys

file_path = r'c:\Users\Josphat Mburu\Documents\codes\ludo\server.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_resolve = '''    socket.on('resolveCard', () => {
        const uuid = socket.uuid;
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (uuid !== currentPid) return;
        const player = monopolyState.players[currentPid];
        if (!player || !player.pendingAction || player.pendingAction.type !== 'draw_card') return;
        
        const deckName = player.pendingAction.deck + 'Deck';
        if (!monopolyState[deckName] || monopolyState[deckName].length === 0) return;
        
        const drawnCard = monopolyState[deckName].shift();
        monopolyState[deckName].push(drawnCard); // put at bottom
        
        applyCard(currentPid, drawnCard);
        player.pendingAction = null;
        
        monopolyIo.emit('gameState', monopolyState);
        setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 4000);
    });'''

new_resolve = '''    socket.on('resolveCard', () => {
        const uuid = socket.uuid;
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (uuid !== currentPid) return;
        const player = monopolyState.players[currentPid];
        if (!player || !player.pendingAction || player.pendingAction.type !== 'draw_card') return;
        
        const deckName = player.pendingAction.deck + 'Deck';
        if (!monopolyState[deckName] || monopolyState[deckName].length === 0) return;
        
        const drawnCard = monopolyState[deckName].shift();
        monopolyState[deckName].push(drawnCard); // put at bottom
        
        const moved = applyCard(currentPid, drawnCard);
        
        if (moved) {
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => { handleLanding(currentPid); }, 1500);
        } else {
            player.pendingAction = null;
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 4000);
        }
    });'''

content = content.replace(old_resolve, new_resolve)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done resolve!')
