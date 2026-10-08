const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const targetStr = `<div style="font-weight: 900; font-size: 0.9rem; color: #0f172a;">\${player.username} \${uuid === myUuid ? '(You)' : ''}</div>`;
const replacement = `
                <div style="font-weight: 900; font-size: 0.9rem; color: #0f172a; display: flex; justify-content: space-between; align-items: center;">
                    <span>\${player.username} \${uuid === myUuid ? '(You)' : ''}</span>
                    <span style="display: flex;">
                        \${state.status === 'LOBBY' && uuid === myUuid ? \`<button onclick="window.promptEditName()" style="background: transparent; border: none; color: #3b82f6; font-size: 1rem; cursor: pointer; padding: 0 5px;" title="Edit Name">✎</button>\` : ''}
                        \${state.status === 'LOBBY' && state.host === myUuid && uuid !== myUuid ? \`<button onclick="socket.emit('removePlayer', '\${uuid}')" style="background: transparent; border: none; color: #ef4444; font-size: 1.2rem; cursor: pointer; padding: 0 5px;" title="Remove Player">&times;</button>\` : ''}
                    </span>
                </div>
`;

if (game.includes(targetStr)) {
    game = game.replace(targetStr, replacement);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Injected UI for name edit and removing players");
}

// Add global promptEditName function
const globalFunc = `
window.promptEditName = async function() {
    const { value: name } = await Swal.fire({
        title: 'Edit Name',
        input: 'text',
        inputLabel: 'Enter new name',
        inputValue: currentGameState && currentGameState.players[myUuid] ? currentGameState.players[myUuid].username : '',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        background: '#ffffff',
        color: '#0f172a',
        customClass: { popup: 'glass-panel' }
    });
    if (name) socket.emit('editName', name);
};
`;

if (!game.includes("window.promptEditName")) {
    game += "\\n" + globalFunc;
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Injected global promptEditName");
}
