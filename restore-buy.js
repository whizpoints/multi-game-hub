const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const newBuyLogic = `
    socket.on('buyProperty', (willBuy) => {
        const uuid = socket.uuid;
        const player = monopolyState.players[uuid];
        if (player && player.pendingAction && player.pendingAction.type === 'buy') {
            const tileIndex = player.pendingAction.tileIndex;
            const price = player.pendingAction.price;
            
            if (willBuy) {
                if (player.cash >= price) {
                    player.cash -= price;
                    monopolyState.properties[tileIndex] = { owner: uuid, houses: 0, mortgaged: false };
                    
                    const boardData = require('./public/monopoly/boardData.js');
                    const name = boardData[tileIndex] ? boardData[tileIndex].name : ('Property ' + tileIndex);
                    monopolyIo.emit('systemMessage', \`\${player.username} bought \${name}.\`);
                } else {
                    socket.emit('errorMsg', "Insufficient funds to buy this property.");
                    startAuction(tileIndex, Math.max(10, Math.floor(price / 4)));
                    player.pendingAction = null;
                    return;
                }
                player.pendingAction = null;
                monopolyIo.emit('gameState', monopolyState);
                setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 500);
            } else {
                player.pendingAction = null;
                startAuction(tileIndex, Math.max(10, Math.floor(price / 4)));
            }
        }
    });
`;

server = server.replace(/socket\.on\('auctionProperty',/, newBuyLogic + "\n    socket.on('auctionProperty',");
fs.writeFileSync('server.js', server);
console.log('Restored buyProperty');
