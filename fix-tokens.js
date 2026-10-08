const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const newTokensLogic = `function positionTokenAt(tokenEl, uuid, position) {
    const tile = document.getElementById('tile-' + position);
    if (!tile) return;
    
    const rect = tile.getBoundingClientRect();
    const boardRect = document.getElementById('board').getBoundingClientRect();
    
    let playersOnTile = [];
    if (window.currentGameStateObj) {
        playersOnTile = Object.values(window.currentGameStateObj.players)
            .filter(p => p.position === position)
            .map(p => p.uuid)
            .sort();
    }
    
    const myIndex = Math.max(0, playersOnTile.indexOf(uuid));
    
    const offsetX = (myIndex % 2) * 20 - 10;
    const offsetY = Math.floor(myIndex / 2) * 20 - 10;
    
    const centerX = rect.left - boardRect.left + (rect.width / 2) + offsetX;
    const centerY = rect.top - boardRect.top + (rect.height / 2) + offsetY;
    
    tokenEl.style.transform = \`translate(\${centerX}px, \${centerY}px) translate(-50%, -50%)\`;
}

function renderBoardTokens(state) {
    Object.values(state.players).forEach(p => {
        let tokenEl = document.getElementById('token-' + p.uuid);
        if (!tokenEl) {
            tokenEl = document.createElement('div');
            tokenEl.id = 'token-' + p.uuid;
            tokenEl.className = 'player-token-anim';
            tokenEl.innerHTML = \`<div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; overflow: visible; font-size: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">\${p.symbol}</div>\`;
            tokenEl.style.color = p.color;
            tokenEl.style.zIndex = '10';
            tokenEl.style.position = 'absolute';
            tokenEl.style.top = '0';
            tokenEl.style.left = '0';
            tokenEl.style.pointerEvents = 'none';
            document.getElementById('board').appendChild(tokenEl);
        }
        
        if (!isAnimatingHops) {
            positionTokenAt(tokenEl, p.uuid, p.position);
            visualPositions[p.uuid] = p.position;
        }
        tokenEl.style.opacity = p.online ? '1' : '0.3';
    });
}`;

const startIndex = game.indexOf("function renderBoardTokens(state) {");
const endIndex = game.indexOf("async function animateHopsForState(state) {");

if (startIndex !== -1 && endIndex !== -1) {
    game = game.substring(0, startIndex) + newTokensLogic + "\n\n" + game.substring(endIndex);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Restored positionTokenAt and fixed renderBoardTokens");
} else {
    console.log("Could not find bounds");
}
