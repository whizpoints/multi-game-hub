const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// Add errorMsg handler
if (!game.includes("socket.on('errorMsg'")) {
    const errorMsgHandler = `
socket.on('errorMsg', (msg) => {
    Swal.fire('Error', msg, 'error');
});
`;
    game = game.replace("socket.on('connect'", errorMsgHandler + "socket.on('connect'");
}

// Add turn indicator to UI
if (!game.includes('id="turn-indicator"')) {
    game = game.replace(
        "function updateControls(state) {",
        `
function updateControls(state) {
    let turnIndicator = document.getElementById('turn-indicator');
    if (!turnIndicator) {
        turnIndicator = document.createElement('div');
        turnIndicator.id = 'turn-indicator';
        turnIndicator.style.fontSize = '1.8rem';
        turnIndicator.style.fontWeight = '900';
        turnIndicator.style.color = '#0f172a';
        turnIndicator.style.textAlign = 'center';
        turnIndicator.style.marginBottom = '20px';
        turnIndicator.style.textTransform = 'uppercase';
        rollBtn.parentNode.insertBefore(turnIndicator, rollBtn);
    }
`
    );
}

// Update turn indicator text
game = game.replace(
    /if \(state.status === 'LOBBY'\) \{/,
    `if (state.status === 'LOBBY') {
        if (document.getElementById('turn-indicator')) {
            document.getElementById('turn-indicator').textContent = 'WAITING FOR PLAYERS...';
        }
`
);

game = game.replace(
    /const currentTurnUuid = state\.turnOrder\[state\.currentTurnIndex\];\n\s+if \(currentTurnUuid === myUuid/,
    `const currentTurnUuid = state.turnOrder[state.currentTurnIndex];
    const currentPlayer = state.players[currentTurnUuid];
    if (document.getElementById('turn-indicator') && currentPlayer) {
        document.getElementById('turn-indicator').textContent = (currentTurnUuid === myUuid ? 'YOUR TURN' : currentPlayer.username + "'S TURN");
    }
    if (currentTurnUuid === myUuid`
);

// Add Upgrade button to Property Details
if (!game.includes('buyHouse()')) {
    const upgradeHTML = `
    const buyHouseBtn = document.createElement('button');
    buyHouseBtn.id = 'buy-house-btn';
    buyHouseBtn.className = 'glass-btn';
    buyHouseBtn.style.width = '100%';
    buyHouseBtn.style.marginTop = '15px';
    buyHouseBtn.style.fontSize = '0.9rem';
    buyHouseBtn.style.background = '#22c55e';
    buyHouseBtn.style.display = 'none';
    buyHouseBtn.textContent = 'UPGRADE (BUY HOUSE)';
    buyHouseBtn.onclick = () => window.buyHouse();
    document.getElementById('property-details').appendChild(buyHouseBtn);

    window.buyHouse = function() {
        if (window.currentViewedTileIndex !== undefined) {
            socket.emit('buyHouse', window.currentViewedTileIndex);
        }
    };
`;
    // We will just inject the button on first property view
    game = game.replace(
        "function showPropertyDetails(tile) {",
        `
function showPropertyDetails(tile) {
    if (!document.getElementById('buy-house-btn')) {
        ${upgradeHTML}
    }
    const idx = parseInt(tile.id.replace('tile-', ''), 10);
    window.currentViewedTileIndex = idx;
`
    );
    
    // Toggle visibility of buy house button based on ownership
    game = game.replace(
        /if \(tile\.type === 'property'\) \{/,
        `if (tile.type === 'property') {
            const btn = document.getElementById('buy-house-btn');
            if (btn && currentGameState && currentGameState.properties[window.currentViewedTileIndex]) {
                const prop = currentGameState.properties[window.currentViewedTileIndex];
                if (prop.owner === myUuid && prop.houses < 5) {
                    btn.style.display = 'block';
                    btn.textContent = 'UPGRADE ($' + (boardData[window.currentViewedTileIndex].houseCost || 50) + ')';
                } else {
                    btn.style.display = 'none';
                }
            } else if (btn) {
                btn.style.display = 'none';
            }`
    );
}

fs.writeFileSync('public/monopoly/game.js', game);
console.log('game.js updated');
