const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const missingLogic = `
const socket = io('/monopoly');

let myUuid = localStorage.getItem('monopoly_uuid');
if (!myUuid) {
    myUuid = 'guest_' + Math.floor(Math.random() * 100000);
    localStorage.setItem('monopoly_uuid', myUuid);
}

let myUsername = localStorage.getItem('monopoly_username');
if (!myUsername) {
    myUsername = 'Guest ' + Math.floor(Math.random() * 1000);
    localStorage.setItem('monopoly_username', myUsername);
}

socket.emit('joinGame', { uuid: myUuid, username: myUsername });

socket.on('systemMessage', (msg) => {
    const log = document.getElementById('action-log');
    if (log) {
        const div = document.createElement('div');
        div.style.padding = '4px 8px';
        div.style.borderBottom = '1px solid #e2e8f0';
        div.style.fontSize = '0.85rem';
        div.textContent = msg;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }
});

socket.on('errorMsg', (msg) => {
    Swal.fire({
        title: 'Notice',
        text: msg,
        icon: 'error',
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'glass-panel' }
    });
});

const hostControlsEl = document.getElementById('host-controls');
const addBotBtn = document.getElementById('add-bot-btn');
const addLocalBtn = document.getElementById('add-local-btn');
const startGameBtn = document.getElementById('start-game-btn');

if (addBotBtn) addBotBtn.addEventListener('click', () => socket.emit('addBot'));
if (addLocalBtn) addLocalBtn.addEventListener('click', async () => {
    const { value: name } = await Swal.fire({
        title: 'Add Local Player',
        input: 'text',
        inputLabel: 'Enter player name',
        inputPlaceholder: 'e.g., Player 2',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        background: '#ffffff',
        color: '#0f172a',
        customClass: { popup: 'glass-panel' }
    });
    if (name) socket.emit('addLocalPlayer', name);
});
if (startGameBtn) startGameBtn.addEventListener('click', () => socket.emit('startGame'));

function renderPlayersList(state) {
    const list = document.getElementById('players-list');
    if (!list) return;
    list.innerHTML = '';
    
    state.turnOrder.forEach((uuid, idx) => {
        const player = state.players[uuid];
        if (!player) return;
        
        const isMyTurn = (state.currentTurnIndex === idx);
        const html = \`
        <div class="player-card" style="\${isMyTurn ? 'border: 2px solid #2563eb; transform: scale(1.02);' : ''}">
            <div style="width: 4px; background: \${player.color}; position: absolute; left: 0; top: 0; bottom: 0; border-radius: 8px 0 0 8px;"></div>
            <div style="display: flex; flex-direction: column; width: 100%;">
                <div style="font-weight: 900; font-size: 0.9rem; color: #0f172a; display: flex; justify-content: space-between; align-items: center;">
                    <span>\${player.username} \${uuid === myUuid ? '(You)' : ''}</span>
                    <span style="display: flex;">
                        \${state.status === 'LOBBY' && uuid === myUuid ? \`<button onclick="window.promptEditName()" style="background: transparent; border: none; color: #3b82f6; font-size: 1rem; cursor: pointer; padding: 0 5px;" title="Edit Name">✎</button>\` : ''}
                        \${state.status === 'LOBBY' && state.host === myUuid && uuid !== myUuid ? \`<button onclick="socket.emit('removePlayer', '\${uuid}')" style="background: transparent; border: none; color: #ef4444; font-size: 1.2rem; cursor: pointer; padding: 0 5px;" title="Remove Player">&times;</button>\` : ''}
                    </span>
                </div>
                <div style="font-size: 1rem; font-weight: 900; color: #16a34a;">$\${player.cash}</div>
            </div>
        </div>
        \`;
        
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        list.appendChild(wrapper.firstElementChild);
    });
}
`;

const targetIndex = game.indexOf("function showPropertyDetails(tile) {");
if (targetIndex !== -1 && !game.includes("const socket = io('/monopoly');")) {
    game = game.substring(0, targetIndex) + missingLogic + "\n\n" + game.substring(targetIndex);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Restored missing game.js components");
}
