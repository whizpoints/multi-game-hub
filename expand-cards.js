const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

// Replace the current deck init with 16 cards each
const deckInitRegex = /const baseChance = \[\s*\{ text: "Advance to GO[\s\S]*?monopolyState\.chestDeck = \[\.\.\.baseChest\]\.sort\(\(\) => Math\.random\(\) - 0\.5\);/g;

const newDeckInit = `const baseChance = [
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
    monopolyState.chestDeck = [...baseChest].sort(() => Math.random() - 0.5);`;

server = server.replace(deckInitRegex, newDeckInit);

// Replace applyCard logic to handle the new actions
const applyCardRegex = /function applyCard\(uuid, card\) \{[\s\S]*?\}\n/g;

const newApplyCard = `function applyCard(uuid, card) {
    const player = monopolyState.players[uuid];
    if (!player) return;
    monopolyIo.emit('systemMessage', \`\${player.username} drew: "\${card.text}"\`);
    
    if (card.action === 'advance_to') {
        const oldPos = player.position;
        player.position = card.target;
        if (player.position < oldPos && player.position !== 0) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', \`\${player.username} passed GO and collected $200.\`);
        }
    } else if (card.action === 'advance_rail') {
        const p = player.position;
        let target = 5;
        if (p >= 5 && p < 15) target = 15;
        else if (p >= 15 && p < 25) target = 25;
        else if (p >= 25 && p < 35) target = 35;
        
        if (target === 5 && p >= 35) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', \`\${player.username} passed GO and collected $200.\`);
        }
        player.position = target;
    } else if (card.action === 'advance_utility') {
        const p = player.position;
        let target = 12;
        if (p >= 12 && p < 28) target = 28;
        
        if (target === 12 && p >= 28) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', \`\${player.username} passed GO and collected $200.\`);
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
}
`;

server = server.replace(applyCardRegex, newApplyCard);

// Also add a 'useJailCard' event
if (!server.includes("socket.on('useJailCard'")) {
    const jailCardEvent = `
    socket.on('useJailCard', () => {
        const uuid = socket.uuid;
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (uuid !== currentPid) return;
        const player = monopolyState.players[currentPid];
        if (player && player.inJail && player.getOutJailFree > 0) {
            player.getOutJailFree -= 1;
            player.inJail = false;
            monopolyIo.emit('systemMessage', \`\${player.username} used a Get Out of Jail Free card!\`);
            monopolyIo.emit('gameState', monopolyState);
        }
    });
`;
    server = server.replace(/function applyCard/, jailCardEvent + "\nfunction applyCard");
}

fs.writeFileSync('server.js', server);
console.log('Cards expanded to 16 each and logic updated');
