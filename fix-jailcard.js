const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// Remove from outside
server = server.replace(/socket\.on\('useJailCard', \(\) => \{[\s\S]*?\}\);\s*/, "");

// Insert inside
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
server = server.replace(/socket\.on\('resolveCard', \(\) => \{/, jailCardEvent + "\n    socket.on('resolveCard', () => {");

fs.writeFileSync('server.js', server);
console.log('Fixed useJailCard scope');
