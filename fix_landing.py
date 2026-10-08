import sys

file_path = r'c:\Users\Josphat Mburu\Documents\codes\ludo\server.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace handleLanding entirely.
start_landing = '''    function handleLanding(targetUuid) {'''
end_landing = '''    function handleRollDice(targetUuid) {'''

idx1 = content.find(start_landing)
idx2 = content.find(end_landing)
if idx1 != -1 and idx2 != -1:
    new_landing = '''    function handleLanding(targetUuid) {
        const player = monopolyState.players[targetUuid];
        if (!player) return;
        
        const tileIndex = player.position;
        const tileData = boardData[tileIndex];
        
        if (tileData && (tileData.type === 'property' || tileData.type === 'station' || tileData.type === 'utility')) {
            const prop = monopolyState.properties[tileIndex];
            if (!prop) {
                player.pendingAction = { type: 'buy', tileIndex, price: tileData.price };
                monopolyIo.emit('gameState', monopolyState);
    
                if (player.isBot) {
                    setTimeout(() => {
                        const willBuy = player.cash > (tileData.price + 500); 
                        monopolyState.players[targetUuid].pendingAction = null;
                        if (willBuy) {
                            player.cash -= tileData.price;
                            monopolyState.properties[tileIndex] = { owner: targetUuid, houses: 0 };
                            monopolyIo.emit('systemMessage', ${player.username} bought );
                        }
                        monopolyIo.emit('gameState', monopolyState);
                        setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 1000);
                    }, 1500);
                }
                return;
            } else if (prop.owner !== targetUuid && !prop.mortgaged) {
                const owner = prop.owner;
                let rent = 0;
                
                if (tileData.type === 'property') {
                    rent = tileData.rent ? tileData.rent.base : 100;
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
                } else if (tileData.type === 'station') {
                    let owned = 0;
                    boardData.forEach((t, i) => {
                        if (t.type === 'station' && monopolyState.properties[i] && monopolyState.properties[i].owner === owner) owned++;
                    });
                    if (owned === 1) rent = 250;
                    else if (owned === 2) rent = 500;
                    else if (owned === 3) rent = 1000;
                    else if (owned === 4) rent = 2000;
                } else if (tileData.type === 'utility') {
                    let owned = 0;
                    boardData.forEach((t, i) => {
                        if (t.type === 'utility' && monopolyState.properties[i] && monopolyState.properties[i].owner === owner) owned++;
                    });
                    const steps = player.lastRoll || 7;
                    if (owned === 1) rent = 40 * steps;
                    else if (owned === 2) rent = 100 * steps;
                }

                if (rent > 0) {
                    player.cash -= rent;
                    if (monopolyState.players[owner]) {
                        monopolyState.players[owner].cash += rent;
                    }
                    monopolyIo.emit('systemMessage', ${player.username} paid {rent} rent to .);
                }
            }
        } else if (tileData && tileData.type === 'tax') {
            const amt = tileData.amount || 2000;
            player.cash -= amt;
            monopolyIo.emit('systemMessage', ${player.username} paid {amt} in taxes.);
        } else if (tileData && (tileData.type === 'chest' || tileData.type === 'chance')) {
            player.pendingAction = { type: 'draw_card', deck: tileData.type };
            monopolyIo.emit('gameState', monopolyState);
            if (player.isBot) {
                setTimeout(() => {
                    const deckName = player.pendingAction.deck + 'Deck';
                    if (monopolyState[deckName] && monopolyState[deckName].length > 0) {
                        const drawnCard = monopolyState[deckName].shift();
                        monopolyState[deckName].push(drawnCard);
                        const moved = applyCard(targetUuid, drawnCard);
                        if (moved) {
                            monopolyIo.emit('gameState', monopolyState);
                            setTimeout(() => { handleLanding(targetUuid); }, 1500);
                            return;
                        }
                    }
                    if (monopolyState.players[targetUuid]) monopolyState.players[targetUuid].pendingAction = null;
                    monopolyIo.emit('gameState', monopolyState);
                    setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 4000);
                }, 1500);
            }
            return;
        } else if (tileData && tileData.type === 'go_to_jail') {
            player.position = 10;
            player.inJail = true;
            player.justRolledDouble = false;
        }
        
        monopolyIo.emit('gameState', monopolyState);
        
        if (player.isBot) {
            setTimeout(endTurnOrRollAgain, 4000);
        } else {
            endTurnOrRollAgain();
        }
    }

'''
    content = content[:idx1] + new_landing + content[idx2:]

# Now modify handleRollDice to save player.lastRoll
old_roll_logic = '''    const d2 = Math.floor(Math.random() * 6) + 1;
    let isDouble = (d1 === d2);
    const steps = d1 + d2;
    
    if (player.inJail) {'''

new_roll_logic = '''    const d2 = Math.floor(Math.random() * 6) + 1;
    let isDouble = (d1 === d2);
    const steps = d1 + d2;
    player.lastRoll = steps;
    
    if (player.inJail) {'''

content = content.replace(old_roll_logic, new_roll_logic)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
