const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const oldLogic = `} else if (tileData && (tileData.type === 'chest' || tileData.type === 'chance')) {
            const isGood = Math.random() > 0.5;
            const amt = isGood ? 1000 : -500;
            player.cash += amt;
            const msg = isGood ? 'received $1000 from the bank' : 'paid $500 to the bank';
            monopolyIo.emit('systemMessage', \`\${player.username} drew \${tileData.name} and \${msg}.\`);
        }`;

const newLogic = `} else if (tileData && (tileData.type === 'chest' || tileData.type === 'chance')) {
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
                    setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 1000);
                }, 1500);
            }
            return;
        }`;

if (server.includes(oldLogic)) {
    server = server.replace(oldLogic, newLogic);
    fs.writeFileSync('server.js', server);
    console.log('Replaced successfully via exact string match!');
} else {
    console.log('Could not find old logic verbatim. Trying softer replace.');
    // Let's do a substring replace
    const startIdx = server.indexOf("} else if (tileData && (tileData.type === 'chest' || tileData.type === 'chance')) {");
    if (startIdx !== -1) {
        const endStr = "monopolyIo.emit('gameState', monopolyState);";
        const endIdx = server.indexOf(endStr, startIdx);
        if (endIdx !== -1) {
            const part1 = server.substring(0, startIdx);
            const part2 = server.substring(endIdx);
            server = part1 + newLogic + '\n        \n        ' + part2;
            fs.writeFileSync('server.js', server);
            console.log('Replaced via substring match!');
        }
    }
}
