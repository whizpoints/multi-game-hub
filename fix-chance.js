const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const oldChanceLogic = /\} else if \(tileData && \(tileData\.type === 'chest' \|\| tileData\.type === 'chance'\)\) \{[\s\S]*?monopolyIo\.emit\('systemMessage', `\$\{player\.username\} drew \$\{tileData\.name\} and \$\{msg\}\.`\);\n\s+\}/;

const newChanceLogic = `} else if (tileData && (tileData.type === 'chest' || tileData.type === 'chance')) {
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
            monopolyState.players[targetUuid].pendingAction = null;
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 1000);
        }, 1500);
    }
    return;
}`;

server = server.replace(oldChanceLogic, newChanceLogic);

// Ensure deck initialization exists in startGame!
if (!server.includes('monopolyState.chanceDeck = [...baseChance]')) {
    const deckInit = `
    const baseChance = [
        { text: "Advance to GO. Collect $200", action: "advance_to", target: 0 },
        { text: "Advance to the final property on the board.", action: "advance_to", target: 39 },
        { text: "Advance to the nearest Station. If unowned, you may buy it.", action: "advance_rail" },
        { text: "Advance to the nearest Station. If unowned, you may buy it.", action: "advance_rail" },
        { text: "Advance to the nearest Utility. If unowned, you may buy it.", action: "advance_utility" },
        { text: "Bank pays you dividend of $50", action: "collect_50" },
        { text: "Get Out of Jail Free card!", action: "get_out_jail" },
        { text: "Go Back 3 Spaces", action: "go_back_3" },
        { text: "Go directly to Jail. Do not pass GO.", action: "go_jail" },
        { text: "Make general repairs on all your property. Pay $150", action: "pay_150" },
        { text: "Speeding fine $15", action: "pay_15" },
        { text: "Take a trip to the first Station. If you pass GO, collect $200", action: "advance_to", target: 5 },
        { text: "You have been elected Chairman of the Board. Pay each player $50.", action: "pay_all", amount: 50 },
        { text: "Your building loan matures. Collect $150", action: "collect_150" },
        { text: "Advance to tile 11. If you pass GO, collect $200.", action: "advance_to", target: 11 },
        { text: "Advance to tile 24. If you pass GO, collect $200.", action: "advance_to", target: 24 }
    ];
    const baseChest = [
        { text: "Advance to GO. Collect $200", action: "advance_to", target: 0 },
        { text: "Bank error in your favor. Collect $200", action: "collect_200" },
        { text: "Doctor's fees. Pay $50", action: "pay_50" },
        { text: "From sale of stock you get $50", action: "collect_50" },
        { text: "Get Out of Jail Free card!", action: "get_out_jail" },
        { text: "Go directly to Jail. Do not pass GO.", action: "go_jail" },
        { text: "Holiday fund matures. Receive $100", action: "collect_100" },
        { text: "Income tax refund. Collect $20", action: "collect_20" },
        { text: "It is your birthday. Collect $10 from every player", action: "collect_from_all", amount: 10 },
        { text: "Life insurance matures. Collect $100", action: "collect_100" },
        { text: "Pay hospital fees of $100", action: "pay_100" },
        { text: "Pay school fees of $50", action: "pay_50" },
        { text: "Receive $25 consultancy fee", action: "collect_25" },
        { text: "You are assessed for street repairs. Pay $115", action: "pay_115" },
        { text: "You have won second prize in a beauty contest. Collect $10", action: "collect_10" },
        { text: "You inherit $100", action: "collect_100" }
    ];
    monopolyState.chanceDeck = [...baseChance].sort(() => Math.random() - 0.5);
    monopolyState.chestDeck = [...baseChest].sort(() => Math.random() - 0.5);
    `;
    server = server.replace(/monopolyState\.status = 'PLAYING';\n\s*monopolyState\.currentTurnIndex = 0;/, "monopolyState.status = 'PLAYING';\n            monopolyState.currentTurnIndex = 0;\n" + deckInit);
}

fs.writeFileSync('server.js', server);
console.log('Fixed chance logic in handleRollDice and startGame');
