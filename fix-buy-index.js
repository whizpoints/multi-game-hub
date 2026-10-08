const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const oldBuyLogic = `    socket.on('buyProperty', (tileIndex) => {
        const uuid = socket.uuid;
        const player = monopolyState.players[uuid];
        if (player && player.pendingAction && player.pendingAction.type === 'buy') {
            const price = player.pendingAction.price;
            if (player.cash >= price) {
                player.cash -= price;
                monopolyState.properties[tileIndex] = { owner: uuid, houses: 0, mortgaged: false };
                monopolyIo.emit('systemMessage', \`\${player.username} bought property at index \${tileIndex}.\`);
            } else {
                socket.emit('errorMsg', "Insufficient funds to buy this property.");
            }
            player.pendingAction = null;
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 500);
        }
    });`;

const newBuyLogic = `    socket.on('buyProperty', (willBuy) => {
        const uuid = socket.uuid;
        const player = monopolyState.players[uuid];
        if (player && player.pendingAction && player.pendingAction.type === 'buy') {
            const tileIndex = player.pendingAction.tileIndex;
            const price = player.pendingAction.price;
            
            if (willBuy) {
                if (player.cash >= price) {
                    player.cash -= price;
                    monopolyState.properties[tileIndex] = { owner: uuid, houses: 0, mortgaged: false };
                    
                    // Look up the name if available
                    const boardData = require('./public/monopoly/boardData.js');
                    const name = boardData[tileIndex] ? boardData[tileIndex].name : ('Property ' + tileIndex);
                    monopolyIo.emit('systemMessage', \`\${player.username} bought \${name}.\`);
                } else {
                    socket.emit('errorMsg', "Insufficient funds to buy this property.");
                    // Force auction if they don't have enough money but tried to buy
                    startAuction(tileIndex, Math.max(10, Math.floor(price / 4)));
                    player.pendingAction = null;
                    return;
                }
                player.pendingAction = null;
                monopolyIo.emit('gameState', monopolyState);
                setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 500);
            } else {
                // Sent to auction!
                player.pendingAction = null;
                startAuction(tileIndex, Math.max(10, Math.floor(price / 4)));
            }
        }
    });`;

server = server.replace(oldBuyLogic, newBuyLogic);
fs.writeFileSync('server.js', server);
console.log('Fixed buyProperty logic!');
