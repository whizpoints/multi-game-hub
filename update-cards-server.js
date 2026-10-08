const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

// 1. Add Card Decks initialization to startGame
const deckInit = `
    const baseChance = [
        { text: "Advance to GO. Collect $200", action: "advance_go" },
        { text: "Go directly to Jail. Do not pass GO.", action: "go_jail" },
        { text: "Speeding fine $50", action: "pay_50" },
        { text: "Bank pays you dividend of $50", action: "collect_50" },
        { text: "Building loan matures. Collect $150", action: "collect_150" },
        { text: "You have won a crossword competition. Collect $100", action: "collect_100" }
    ];
    const baseChest = [
        { text: "Bank error in your favor. Collect $200", action: "collect_200" },
        { text: "Doctor's fees. Pay $50", action: "pay_50" },
        { text: "Holiday fund matures. Receive $100", action: "collect_100" },
        { text: "Income tax refund. Collect $20", action: "collect_20" },
        { text: "Pay hospital fees of $100", action: "pay_100" },
        { text: "Receive $25 consultancy fee", action: "collect_25" }
    ];
    monopolyState.chanceDeck = [...baseChance].sort(() => Math.random() - 0.5);
    monopolyState.chestDeck = [...baseChest].sort(() => Math.random() - 0.5);
`;

server = server.replace(
    /monopolyState\.status = 'PLAYING';\n\s+monopolyIo\.emit\('gameState', monopolyState\);/,
    "monopolyState.status = 'PLAYING';\n" + deckInit + "\nmonopolyIo.emit('gameState', monopolyState);"
);

// 2. Modify handleRollDice for chance/chest
const oldChanceLogic = /\} else if \(tileData && \(tileData\.type === 'chest' \|\| tileData\.type === 'chance'\)\) \{[\s\S]*?monopolyIo\.emit\('systemMessage', `\$\{player\.username\} drew \$\{tileData\.name\} and \$\{msg\}\.`\);\n\s+\}/;

const newChanceLogic = `} else if (tileData && (tileData.type === 'chest' || tileData.type === 'chance')) {
    player.pendingAction = { type: 'draw_card', deck: tileData.type };
    monopolyIo.emit('gameState', monopolyState);
    if (player.isBot) {
        setTimeout(() => {
            const drawnCard = monopolyState[tileData.type + 'Deck'].shift();
            monopolyState[tileData.type + 'Deck'].push(drawnCard);
            applyCard(targetUuid, drawnCard);
            player.pendingAction = null;
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(endTurnOrRollAgain, 1000);
        }, 1500);
    }
    return;
}`;

server = server.replace(oldChanceLogic, newChanceLogic);

// 3. Add applyCard and socket listener
const applyCardLogic = `
function applyCard(uuid, card) {
    const player = monopolyState.players[uuid];
    if (!player) return;
    monopolyIo.emit('systemMessage', \`\${player.username} drew: "\${card.text}"\`);
    
    if (card.action === 'advance_go') {
        player.position = 0;
        player.cash += 200;
    } else if (card.action === 'go_jail') {
        player.position = 10;
        player.inJail = true;
    } else if (card.action === 'pay_15') {
        player.cash -= 15;
    } else if (card.action === 'pay_50') {
        player.cash -= 50;
    } else if (card.action === 'pay_100') {
        player.cash -= 100;
    } else if (card.action === 'collect_20') {
        player.cash += 20;
    } else if (card.action === 'collect_25') {
        player.cash += 25;
    } else if (card.action === 'collect_50') {
        player.cash += 50;
    } else if (card.action === 'collect_100') {
        player.cash += 100;
    } else if (card.action === 'collect_150') {
        player.cash += 150;
    } else if (card.action === 'collect_200') {
        player.cash += 200;
    }
}

monopolyIo.on('connection', (socket) => {
    socket.on('resolveCard', () => {
        const uuid = socket.uuid;
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (uuid !== currentPid) return;
        const player = monopolyState.players[currentPid];
        if (!player || !player.pendingAction || player.pendingAction.type !== 'draw_card') return;
        
        const deckName = player.pendingAction.deck + 'Deck';
        if (!monopolyState[deckName] || monopolyState[deckName].length === 0) return;
        
        const drawnCard = monopolyState[deckName].shift();
        monopolyState[deckName].push(drawnCard); // put at bottom
        
        applyCard(currentPid, drawnCard);
        player.pendingAction = null;
        
        monopolyIo.emit('gameState', monopolyState);
        setTimeout(endTurnOrRollAgain, 1000);
    });
`;

server = server.replace(/monopolyIo\.on\('connection', \(socket\) => \{/, applyCardLogic);

fs.writeFileSync('server.js', server);
console.log('Server updated for cards');
