const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const uiLogic = `
const quitLobbyBtn = document.getElementById('quit-lobby-btn');
if (quitLobbyBtn) {
    quitLobbyBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Quit to Lobby?',
            text: 'This will end the current game and reset all progress!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reset Game',
            confirmButtonColor: '#ef4444',
            background: '#ffffff',
            color: '#0f172a',
            customClass: { popup: 'glass-panel' }
        }).then(res => {
            if (res.isConfirmed) {
                socket.emit('quitToLobby');
            }
        });
    });
}
`;

if (!game.includes("socket.emit('quitToLobby')")) {
    game += "\n" + uiLogic;
}

// Inject into updateControls
const targetUpdate = "if (hostControlsEl) {";
const updateReplacement = `    const quitLobbyBtn = document.getElementById('quit-lobby-btn');
    if (quitLobbyBtn) {
        if (state.status === 'PLAYING' && state.host === myUuid) {
            quitLobbyBtn.style.display = 'block';
        } else {
            quitLobbyBtn.style.display = 'none';
        }
    }

    if (hostControlsEl) {`;

if (!game.includes("quitLobbyBtn.style.display = 'block';")) {
    game = game.replace(targetUpdate, updateReplacement);
}

fs.writeFileSync('public/monopoly/game.js', game);
console.log("Injected quit UI logic into game.js");
