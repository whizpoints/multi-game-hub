const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const regex = /function handleRollDice\(targetUuid\) \{[\s\S]*?function endTurnOrRollAgain\(\) \{/g;

const newHandleRollDice = `function handleRollDice(targetUuid) {
    if (monopolyState.status !== 'PLAYING') return;
    const player = monopolyState.players[targetUuid];
    if (!player || player.debtState || player.pendingAction) return;
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    let isDouble = (d1 === d2);
    const steps = d1 + d2;
    
    if (player.inJail) {
        if (isDouble) {
            player.inJail = false;
        } else {
            monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid });
            nextTurn();
            return;
        }
    }

    if (isDouble) {
        player.doublesCount++;
        if (player.doublesCount === 3) {
            player.position = 10;
            player.inJail = true;
            player.doublesCount = 0;
            monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid });
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => {
                monopolyIo.emit('systemMessage', \`\${player.username} went to jail for 3 doubles!\`);
                nextTurn();
            }, 600 + 400 + 100);
            return;
        }
    } else {
        player.doublesCount = 0;
    }

    player.position += steps;
    let passedGo = false;
    if (player.position >= 40) {
        player.position -= 40;
        passedGo = true;
    }
    
    let sentToJail = false;
    if (player.position === 30) {
        player.position = 10;
        player.inJail = true;
        isDouble = false; 
        sentToJail = true;
    }

    player.justRolledDouble = isDouble;
    monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid });
    monopolyIo.emit('gameState', monopolyState); // Emit movement instantly for client animation

    let delay = 600 + (steps * 250) + 100;
    if (sentToJail) delay += 400;

    setTimeout(() => {
        if (passedGo) {
            player.cash += 2000;
            monopolyIo.emit('systemMessage', \`\${player.username} collected $2000 for passing GO.\`);
        }

        const tileIndex = player.position;
        const tileData = boardData[tileIndex];
        
        if (tileData && (tileData.type === 'property' || tileData.type === 'station' || tileData.type === 'utility')) {
            const prop = monopolyState.properties[tileIndex];
            if (!prop) {
                // Unowned
                player.pendingAction = { type: 'buy', tileIndex, price: tileData.price };
                monopolyIo.emit('gameState', monopolyState);
    
                if (player.isBot) {
                    setTimeout(() => {
                        const willBuy = player.cash > (tileData.price + 500); 
                        monopolyState.players[targetUuid].pendingAction = null;
                        if (willBuy) {
                            player.cash -= tileData.price;
                            monopolyState.properties[tileIndex] = { owner: targetUuid, houses: 0 };
                            monopolyIo.emit('systemMessage', \`\${player.username} bought \${tileData.name}\`);
                        }
                        monopolyIo.emit('gameState', monopolyState);
                        setTimeout(endTurnOrRollAgain, 1000);
                    }, 1500);
                }
                return;
            } else if (prop.owner !== targetUuid && !prop.mortgaged) {
                const owner = prop.owner;
                let rent = tileData.rent ? tileData.rent.base : 100;
                
                if (tileData.type === 'property') {
                    const houses = prop.houses || 0;
                    if (houses === 1) rent = tileData.rent.house1;
                    else if (houses === 2) rent = tileData.rent.house2;
                    else if (houses === 3) rent = tileData.rent.house3;
                    else if (houses === 4) rent = tileData.rent.house4;
                    else if (houses === 5) rent = tileData.rent.hotel;
                    else {
                        const sameColor = boardData.filter(t => t.color === tileData.color);
                        const ownsAll = sameColor.every((t, i) => {
                            const idx = boardData.indexOf(t);
                            return monopolyState.properties[idx] && monopolyState.properties[idx].owner === owner;
                        });
                        if (ownsAll) rent *= 2;
                    }
                }
                
                if (rent > 0) {
                    player.cash -= rent;
                    if (monopolyState.players[owner]) {
                        monopolyState.players[owner].cash += rent;
                    }
                    monopolyIo.emit('systemMessage', \`\${player.username} paid $\${rent} rent to \${monopolyState.players[owner].username}.\`);
                }
            }
        } else if (tileData && tileData.type === 'tax') {
            const amt = tileData.amount || 2000;
            player.cash -= amt;
            monopolyIo.emit('systemMessage', \`\${player.username} paid $\${amt} in taxes.\`);
        } else if (tileData && (tileData.type === 'chest' || tileData.type === 'chance')) {
            const isGood = Math.random() > 0.5;
            const amt = isGood ? 1000 : -500;
            player.cash += amt;
            const msg = isGood ? 'received $1000 from the bank' : 'paid $500 to the bank';
            monopolyIo.emit('systemMessage', \`\${player.username} drew \${tileData.name} and \${msg}.\`);
        }
        
        monopolyIo.emit('gameState', monopolyState);
        
        if (player.isBot) {
            setTimeout(endTurnOrRollAgain, 4000);
        } else {
            endTurnOrRollAgain();
        }
        
    }, delay);
}

function endTurnOrRollAgain() {`;

server = server.replace(regex, newHandleRollDice);
fs.writeFileSync('server.js', server);
console.log('Timing delayed successfully');
