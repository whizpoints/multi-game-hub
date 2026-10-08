const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const correctList = `function renderPlayersList(state) {
    const list = document.getElementById('players-list');
    if (!list) return;
    list.innerHTML = '';
    
    state.turnOrder.forEach((uuid, idx) => {
        const player = state.players[uuid];
        if (!player) return;
        
        const isMyTurn = (state.currentTurnIndex === idx);
        const html = \`
        <div class="player-card" style="\${isMyTurn ? 'border: 2px solid #2563eb; transform: scale(1.02);' : ''} padding: 8px 12px; margin-bottom: 6px;">
            <div style="width: 4px; background: \${player.color}; position: absolute; left: 0; top: 0; bottom: 0; border-radius: 8px 0 0 8px;"></div>
            <div style="display: flex; flex-direction: column; width: 100%;">
                <div style="font-weight: 800; font-size: 0.75rem; color: #0f172a; display: flex; justify-content: space-between; align-items: center; text-transform: uppercase;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">\${idx + 1}. \${player.username} \${uuid === myUuid ? '(You)' : ''}</span>
                    <span style="display: flex; flex-shrink: 0;">
                        \${state.status === 'LOBBY' && uuid === myUuid ? \`<button onclick="window.promptEditName()" style="background: transparent; border: none; color: #3b82f6; font-size: 0.9rem; cursor: pointer; padding: 0 4px;" title="Edit Name">✎</button>\` : ''}
                        \${state.status === 'LOBBY' && state.host === myUuid && uuid !== myUuid ? \`<button onclick="socket.emit('removePlayer', '\${uuid}')" style="background: transparent; border: none; color: #ef4444; font-size: 1rem; cursor: pointer; padding: 0 4px;" title="Remove Player">&times;</button>\` : ''}
                    </span>
                </div>
                <div style="font-size: 0.85rem; font-weight: 900; color: #16a34a; margin-top: 2px;">$\${player.cash}</div>
            </div>
        </div>
        \`;
        
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        list.appendChild(wrapper.firstElementChild);
    });
    
    // If in lobby and we're the host, let's append an 'Empty Slot' button at the bottom of the list for easy access.
    if (state.status === 'LOBBY' && state.host === myUuid && state.turnOrder.length < 8) {
        const addHtml = \`
        <div class="player-card" style="border: 2px dashed #cbd5e1; background: transparent; cursor: pointer; display: flex; justify-content: center; align-items: center; padding: 10px;" onclick="document.getElementById('add-local-btn').click()">
            <span style="font-weight: 800; font-size: 0.75rem; color: #64748b; text-transform: uppercase;">+ Add Local Player</span>
        </div>
        \`;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = addHtml;
        list.appendChild(wrapper.firstElementChild);
    }
}
`;

const startIndex = game.indexOf("function renderPlayersList(state) {");
const endIndex = game.indexOf("function showPropertyDetails(tile) {");

if (startIndex !== -1 && endIndex !== -1) {
    game = game.substring(0, startIndex) + correctList + "\n\n" + game.substring(endIndex);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Fixed renderPlayersList exactly");
} else {
    console.log("Could not find bounds");
}
