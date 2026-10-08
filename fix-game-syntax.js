const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// There are two "let currentGameState = null;" lines.
// Remove the second one.
const str = "let currentGameState = null;";
const firstIdx = game.indexOf(str);
const secondIdx = game.indexOf(str, firstIdx + 1);

if (secondIdx !== -1) {
    game = game.substring(0, secondIdx) + game.substring(secondIdx + str.length);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Removed duplicate currentGameState");
}

// Make sure window.promptEditName is defined.
if (!game.includes('window.promptEditName = async function')) {
    game += `\nwindow.promptEditName = async function() {
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
    };\n`;
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Injected window.promptEditName");
}
