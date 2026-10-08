const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const sIdx = game.indexOf("const fullscreenBtn = document.getElementById('fullscreen-btn');");

if (sIdx !== -1) {
    const finalEnding = `
const fullscreenBtn = document.getElementById('fullscreen-btn');

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(\`Error attempting to enable fullscreen: \${err.message}\`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullScreen);
}

document.addEventListener('keydown', (e) => {
    if ((e.key === 'f' || e.key === 'F') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        toggleFullScreen();
    }
});

document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        fullscreenBtn.innerHTML = '🗗'; 
    } else {
        fullscreenBtn.innerHTML = '⛶';
    }
});

initBoard();

socket.on('systemMessage', (msg) => { Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, title: msg, icon: 'info' }); });
`;
    game = game.substring(0, sIdx) + finalEnding;
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Truncated and fixed game.js ending");
} else {
    console.log("Could not find boundary");
}
