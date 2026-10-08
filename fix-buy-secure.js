const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const targetRegex = /socket\.on\('buyProperty', \(tileIndex\) => \{[\s\S]*?globalEndTurn\(\); \}, 500\);\n\s+\}\n\s+\}\);/g;

const newBuyLogic = `socket.on('buyProperty', (willBuy) => {
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
    });`;

if (server.match(targetRegex)) {
    server = server.replace(targetRegex, newBuyLogic);
    fs.writeFileSync('server.js', server);
    console.log('Fixed buyProperty logic via regex!');
} else {
    console.log('Regex did not match! Will try substring approach.');
    const startIdx = server.indexOf("socket.on('buyProperty', (tileIndex) => {");
    if (startIdx !== -1) {
        const endStr = "setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 500);\n        }\n    });";
        const endIdx = server.indexOf(endStr, startIdx);
        if (endIdx !== -1) {
            const part1 = server.substring(0, startIdx);
            const part2 = server.substring(endIdx + endStr.length);
            server = part1 + newBuyLogic + part2;
            fs.writeFileSync('server.js', server);
            console.log('Fixed buyProperty logic via substring!');
        } else {
            console.log('End string not found.');
        }
    } else {
        console.log('Start string not found.');
    }
}
