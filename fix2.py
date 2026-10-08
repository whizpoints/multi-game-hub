import sys

file_path = r'c:\Users\Josphat Mburu\Documents\codes\ludo\server.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to rewrite applyCard to return a boolean if moved
old_apply = '''    function applyCard(uuid, card) {
    const player = monopolyState.players[uuid];
    if (!player) return;
    monopolyIo.emit('systemMessage', ${player.username} drew: "");
    monopolyIo.emit('cardDrawn', { uuid, text: card.text });
    
    if (card.action === 'advance_to') {
        const oldPos = player.position;
        player.position = card.target;
        if (player.position < oldPos && player.position !== 0) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', ${player.username} passed GO and collected .);
        }
    } else if (card.action === 'advance_rail') {
        const p = player.position;
        let target = 5;
        if (p >= 5 && p < 15) target = 15;
        else if (p >= 15 && p < 25) target = 25;
        else if (p >= 25 && p < 35) target = 35;
        
        if (target === 5 && p >= 35) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', ${player.username} passed GO and collected .);
        }
        player.position = target;
    } else if (card.action === 'advance_utility') {
        const p = player.position;
        let target = 12;
        if (p >= 12 && p < 28) target = 28;
        
        if (target === 12 && p >= 28) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', ${player.username} passed GO and collected .);
        }
        player.position = target;
    } else if (card.action === 'go_back_3') {
        player.position = (player.position - 3 + 40) % 40;
    } else if (card.action === 'get_out_jail') {
        player.getOutJailFree = (player.getOutJailFree || 0) + 1;
    } else if (card.action === 'go_jail') {
        player.position = 10;
        player.inJail = true;
    } else if (card.action.startsWith('pay_all')) {
        const amt = card.amount || 50;
        let totalPaid = 0;
        monopolyState.turnOrder.forEach(uid => {
            if (uid !== uuid) {
                monopolyState.players[uid].cash += amt;
                totalPaid += amt;
            }
        });
        player.cash -= totalPaid;
    } else if (card.action.startsWith('collect_from_all')) {
        const amt = card.amount || 10;
        let totalCollected = 0;
        monopolyState.turnOrder.forEach(uid => {
            if (uid !== uuid) {
                monopolyState.players[uid].cash -= amt;
                totalCollected += amt;
            }
        });
        player.cash += totalCollected;
    } else if (card.action.startsWith('pay_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        player.cash -= amt;
        } else if (card.action.startsWith('collect_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        player.cash += amt;
    }
}'''

new_apply = '''    function applyCard(uuid, card) {
    const player = monopolyState.players[uuid];
    if (!player) return false;
    monopolyIo.emit('systemMessage', ${player.username} drew: "");
    monopolyIo.emit('cardDrawn', { uuid, text: card.text });
    
    let moved = false;
    
    if (card.action === 'advance_to') {
        const oldPos = player.position;
        player.position = card.target;
        if (player.position < oldPos && player.position !== 0) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', ${player.username} passed GO and collected .);
        }
        moved = true;
    } else if (card.action === 'advance_rail') {
        const p = player.position;
        let target = 5;
        if (p >= 5 && p < 15) target = 15;
        else if (p >= 15 && p < 25) target = 25;
        else if (p >= 25 && p < 35) target = 35;
        
        if (target === 5 && p >= 35) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', ${player.username} passed GO and collected .);
        }
        player.position = target;
        moved = true;
    } else if (card.action === 'advance_utility') {
        const p = player.position;
        let target = 12;
        if (p >= 12 && p < 28) target = 28;
        
        if (target === 12 && p >= 28) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', ${player.username} passed GO and collected .);
        }
        player.position = target;
        moved = true;
    } else if (card.action === 'go_back_3') {
        player.position = (player.position - 3 + 40) % 40;
        moved = true;
    } else if (card.action === 'get_out_jail') {
        player.getOutJailFree = (player.getOutJailFree || 0) + 1;
    } else if (card.action === 'go_jail') {
        player.position = 10;
        player.inJail = true;
        moved = true;
    } else if (card.action.startsWith('pay_all')) {
        const amt = card.amount || 50;
        let totalPaid = 0;
        monopolyState.turnOrder.forEach(uid => {
            if (uid !== uuid) {
                monopolyState.players[uid].cash += amt;
                totalPaid += amt;
            }
        });
        player.cash -= totalPaid;
    } else if (card.action.startsWith('collect_from_all')) {
        const amt = card.amount || 10;
        let totalCollected = 0;
        monopolyState.turnOrder.forEach(uid => {
            if (uid !== uuid) {
                monopolyState.players[uid].cash -= amt;
                totalCollected += amt;
            }
        });
        player.cash += totalCollected;
    } else if (card.action.startsWith('pay_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        player.cash -= amt;
    } else if (card.action.startsWith('collect_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        player.cash += amt;
    }
    
    return moved;
}'''

content = content.replace(old_apply, new_apply)


old_roll_logic = '''    function handleRollDice(targetUuid) {
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
                monopolyIo.emit('systemMessage', ${player.username} went to jail for 3 doubles!);
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
            monopolyIo.emit('systemMessage', ${player.username} collected  for passing GO.);
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
                            monopolyIo.emit('systemMessage', ${player.username} bought );
                        }
                        monopolyIo.emit('gameState', monopolyState);
                        setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 1000);
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
                    monopolyIo.emit('systemMessage', ${player.username} paid  rent to .);
                }
            }
        } else if (tileData && tileData.type === 'tax') {
            const amt = tileData.amount || 2000;
            player.cash -= amt;
            monopolyIo.emit('systemMessage', ${player.username} paid  in taxes.);
        } else if (tileData && (tileData.type === 'chest' || tileData.type === 'chance')) {
            player.pendingAction = { type: 'draw_card', deck: tileData.type };
            monopolyIo.emit('gameState', monopolyState);
            if (player.isBot) {
                setTimeout(() => {
                    const deckName = player.pendingAction.deck + 'Deck';
                    if (monopolyState[deckName] && monopolyState[deckName].length > 0) {
                        const drawnCard = monopolyState[deckName].shift();
                        monopolyState[deckName].push(drawnCard);
                        applyCard(targetUuid, drawnCard);
                    }
                    if (monopolyState.players[targetUuid]) monopolyState.players[targetUuid].pendingAction = null;
                    monopolyIo.emit('gameState', monopolyState);
                    setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 4000);
                }, 1500);
            }
            return;
        }
        
        monopolyIo.emit('gameState', monopolyState);
        
        if (player.isBot) {
            setTimeout(endTurnOrRollAgain, 4000);
        } else {
            endTurnOrRollAgain();
        }
        
    }, delay);
}'''

new_roll_logic = '''    function handleLanding(targetUuid) {
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
                    monopolyIo.emit('systemMessage', ${player.username} paid  rent to .);
                }
            }
        } else if (tileData && tileData.type === 'tax') {
            const amt = tileData.amount || 2000;
            player.cash -= amt;
            monopolyIo.emit('systemMessage', ${player.username} paid  in taxes.);
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

    function handleRollDice(targetUuid) {
    if (monopolyState.status !== 'PLAYING') return;
    const player = monopolyState.players[targetUuid];
    if (!player || player.debtState || player.pendingAction) return;
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    let isDouble = (d1 === d2);
    const steps = d1 + d2;
    
    if (player.inJail) {
        player.turnsInJail = (player.turnsInJail || 0) + 1;
        if (isDouble) {
            player.inJail = false;
            player.turnsInJail = 0;
        } else {
            if (player.turnsInJail >= 3) {
                player.cash -= 50;
                player.inJail = false;
                player.turnsInJail = 0;
                monopolyIo.emit('systemMessage', ${player.username} spent 3 turns in jail and paid  to get out.);
            } else {
                monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid });
                nextTurn();
                return;
            }
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
                monopolyIo.emit('systemMessage', ${player.username} went to jail for 3 doubles!);
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
            monopolyIo.emit('systemMessage', ${player.username} collected  for passing GO.);
        }
        handleLanding(targetUuid);
    }, delay);
}'''

content = content.replace(old_roll_logic, new_roll_logic)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done roll logic!')
