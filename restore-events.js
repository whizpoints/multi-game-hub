const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const missingEvents = `
    socket.on('joinGame', (data) => {
        socket.uuid = data.uuid;
        if (!monopolyState.players[data.uuid]) {
            const neonColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#ff8800', '#00ff88'];
            const color = neonColors[monopolyState.turnOrder.length % neonColors.length];
            monopolyState.players[data.uuid] = {
                uuid: data.uuid,
                username: data.username || 'Guest',
                cash: 15000,
                position: 0,
                color: color,
                isBot: false,
                doublesCount: 0,
                inJail: false,
                debtState: false,
                pendingAction: null,
                getOutJailFree: 0
            };
            if (!monopolyState.turnOrder.includes(data.uuid)) {
                monopolyState.turnOrder.push(data.uuid);
            }
            if (!monopolyState.host) {
                monopolyState.host = data.uuid;
            }
        }
        monopolyIo.emit('systemMessage', \`\${data.username || 'A player'} joined the lobby.\`);
        monopolyIo.emit('gameState', monopolyState);
    });

    socket.on('addBot', () => {
        if (socket.uuid === monopolyState.host && monopolyState.status === 'LOBBY' && monopolyState.turnOrder.length < 8) {
            const botId = 'bot_' + Math.floor(Math.random() * 10000);
            const neonColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#ff8800', '#00ff88'];
            const color = neonColors[monopolyState.turnOrder.length % neonColors.length];
            monopolyState.players[botId] = {
                uuid: botId,
                username: 'Bot ' + Math.floor(Math.random() * 100),
                cash: 15000,
                position: 0,
                color: color,
                isBot: true,
                doublesCount: 0,
                inJail: false,
                debtState: false,
                pendingAction: null,
                getOutJailFree: 0
            };
            monopolyState.turnOrder.push(botId);
            monopolyIo.emit('systemMessage', \`\${monopolyState.players[botId].username} joined the lobby.\`);
            monopolyIo.emit('gameState', monopolyState);
        }
    });

    socket.on('startGame', () => {
        if (socket.uuid === monopolyState.host && monopolyState.status === 'LOBBY') {
            monopolyState.status = 'PLAYING';
            monopolyState.currentTurnIndex = 0;
            monopolyIo.emit('systemMessage', \`The game has started!\`);
            monopolyIo.emit('gameState', monopolyState);
            checkBotTurn();
        }
    });

    socket.on('rollDice', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (socket.uuid === currentPid) {
            handleRollDice(socket.uuid);
        }
    });

    socket.on('payJailFine', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (socket.uuid === currentPid) {
            const player = monopolyState.players[socket.uuid];
            if (player && player.inJail) {
                if (player.cash >= 50) {
                    player.cash -= 50;
                    player.inJail = false;
                    monopolyIo.emit('systemMessage', \`\${player.username} paid $50 to leave jail.\`);
                    monopolyIo.emit('gameState', monopolyState);
                } else {
                    socket.emit('errorMsg', "Insufficient funds. Roll for doubles!");
                }
            }
        }
    });

    socket.on('buyProperty', (tileIndex) => {
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
    });

    socket.on('auctionProperty', (tileIndex) => {
        const uuid = socket.uuid;
        const player = monopolyState.players[uuid];
        if (player && player.pendingAction && player.pendingAction.type === 'buy') {
            const price = player.pendingAction.price;
            player.pendingAction = null;
            startAuction(tileIndex, Math.max(10, Math.floor(price / 4)));
        }
    });

    socket.on('placeBid', (amount) => {
        if (monopolyState.status === 'AUCTION') {
            const auc = monopolyState.auction;
            if (auc && auc.activeBidders.includes(socket.uuid)) {
                auc.currentBid += amount;
                auc.highestBidder = socket.uuid;
                auc.timer = 15;
                monopolyIo.emit('gameState', monopolyState);
            }
        }
    });

    socket.on('foldAuction', () => {
        if (monopolyState.status === 'AUCTION') {
            const auc = monopolyState.auction;
            if (auc) {
                auc.activeBidders = auc.activeBidders.filter(u => u !== socket.uuid);
                if (auc.activeBidders.length < 2 && auc.highestBidder) {
                    endAuction();
                } else if (auc.activeBidders.length === 0) {
                    endAuction();
                } else {
                    monopolyIo.emit('gameState', monopolyState);
                }
            }
        }
    });

    socket.on('buyHouse', (tileIndex) => {
        const uuid = socket.uuid;
        const player = monopolyState.players[uuid];
        if (!player) return;
        const prop = monopolyState.properties[tileIndex];
        const tileData = boardData[tileIndex];
        
        if (prop && prop.owner === uuid && !prop.mortgaged && prop.houses < 5) {
            const cost = tileData.houseCost || 50;
            if (player.cash >= cost) {
                player.cash -= cost;
                prop.houses = (prop.houses || 0) + 1;
                monopolyIo.emit('systemMessage', \`\${player.username} upgraded \${tileData.name}.\`);
                monopolyIo.emit('gameState', monopolyState);
            } else {
                socket.emit('errorMsg', "Not enough cash to upgrade!");
            }
        }
    });
`;

server = server.replace(/monopolyIo\.on\('connection', \(socket\) => \{/, "monopolyIo.on('connection', (socket) => {" + missingEvents);
fs.writeFileSync('server.js', server);
console.log('Restored all deleted socket events!');
